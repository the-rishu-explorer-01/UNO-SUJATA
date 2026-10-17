import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { prisma } from "../utils/prisma.js";
import { HttpError } from "../utils/http.js";
import { audit } from "./audit.service.js";
import { checkProductFile, displayName, MAX_FILES_PER_PRODUCT, type ProductFileKindValue } from "../lib/productFileRules.js";

const STORED = /^[0-9a-f-]{36}\.(pdf|glb)$/;

export function productFilesDir(): string {
  return path.resolve(process.env.PRIVATE_FILES_DIR ?? "./uploads/product-files");
}

function dto(f: { id: string; kind: string; label: string; originalName: string; mimeType: string; sizeBytes: number; isPublic: boolean; sortOrder: number; createdAt: Date }) {
  return { id: f.id, kind: f.kind, label: f.label, name: f.originalName, mimeType: f.mimeType, sizeBytes: f.sizeBytes, isPublic: f.isPublic, sortOrder: f.sortOrder, createdAt: f.createdAt };
}

export async function listAdminFiles(productId: string) {
  const exists = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!exists) throw new HttpError(404, "Product not found");
  const rows = await prisma.productFile.findMany({ where: { productId }, orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] });
  return rows.map(dto);
}

/** Public: only approved files of published, non-archived products. Drawings are listed only when approved. */
export async function listPublicFiles(slug: string) {
  const product = await prisma.product.findFirst({ where: { slug, published: true, archivedAt: null }, select: { id: true } });
  if (!product) throw new HttpError(404, "Product not found");
  const rows = await prisma.productFile.findMany({ where: { productId: product.id, isPublic: true }, orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] });
  return rows.map((f) => ({ ...dto(f), url: `/api/product-files/${f.id}` }));
}

export async function uploadFile(
  actorId: string,
  productId: string,
  meta: { kind: ProductFileKindValue; label: string; isPublic: boolean },
  file: { buffer: Buffer; size: number; originalname: string }
) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true, _count: { select: { files: true } } } });
  if (!product) throw new HttpError(404, "Product not found");
  if (product._count.files >= MAX_FILES_PER_PRODUCT) throw new HttpError(422, `A product can have up to ${MAX_FILES_PER_PRODUCT} files.`);

  const check = checkProductFile(meta.kind, file.originalname, file.buffer, file.size);
  if (!check.ok) throw new HttpError(422, check.reason, { file: [check.reason] });

  const dir = productFilesDir();
  await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
  const storedName = `${randomUUID()}.${check.storedExtension}`;
  const fullPath = path.join(dir, storedName);
  await fs.promises.writeFile(fullPath, file.buffer, { flag: "wx", mode: 0o600 });
  try {
    const row = await prisma.productFile.create({
      data: {
        productId,
        kind: meta.kind,
        label: meta.label.trim().slice(0, 80) || "File",
        originalName: displayName(file.originalname),
        storedName,
        mimeType: check.mimeType,
        extension: check.extension,
        sizeBytes: file.size,
        sha256: createHash("sha256").update(file.buffer).digest("hex"),
        isPublic: meta.isPublic,
      },
    });
    await audit({ actorId, action: "product.file_uploaded", entityType: "Product", entityId: productId, summary: `Uploaded ${meta.kind.toLowerCase()} for ${product.name}` });
    return dto(row);
  } catch (err) {
    await fs.promises.rm(fullPath, { force: true }).catch(() => undefined);
    throw err;
  }
}

export async function updateFile(actorId: string, fileId: string, patch: { label?: string; isPublic?: boolean; sortOrder?: number }) {
  const row = await prisma.productFile.findUnique({ where: { id: fileId }, include: { product: { select: { name: true } } } });
  if (!row) throw new HttpError(404, "File not found");
  await prisma.productFile.update({ where: { id: fileId }, data: patch });
  await audit({
    actorId,
    action: "product.file_updated",
    entityType: "Product",
    entityId: row.productId,
    summary: `${patch.isPublic === undefined ? "Updated" : patch.isPublic ? "Approved for public display:" : "Made private:"} ${row.originalName}`,
  });
}

export async function deleteFile(actorId: string, fileId: string) {
  const row = await prisma.productFile.findUnique({ where: { id: fileId } });
  if (!row) throw new HttpError(404, "File not found");
  await prisma.productFile.delete({ where: { id: fileId } });
  if (STORED.test(row.storedName)) await fs.promises.rm(path.join(productFilesDir(), row.storedName), { force: true }).catch(() => undefined);
  await audit({ actorId, action: "product.file_deleted", entityType: "Product", entityId: row.productId, summary: `Deleted ${row.originalName}` });
}

/**
 * Opens a file for streaming. Public requests get a file only when it is approved and its product is
 * published and not archived. Anything else is reported as not found, so the API does not reveal private files.
 */
export async function openFile(fileId: string, opts: { publicOnly: boolean }) {
  const row = await prisma.productFile.findUnique({
    where: { id: fileId },
    include: { product: { select: { published: true, archivedAt: true } } },
  });
  if (!row) throw new HttpError(404, "File not found");
  if (opts.publicOnly && (!row.isPublic || !row.product.published || row.product.archivedAt)) {
    throw new HttpError(404, "File not found");
  }
  if (!STORED.test(row.storedName)) throw new HttpError(500, "File unavailable");
  const fullPath = path.join(productFilesDir(), row.storedName);
  if (path.dirname(fullPath) !== productFilesDir() || !fs.existsSync(fullPath)) throw new HttpError(404, "File not available");
  return { fullPath, mimeType: row.mimeType, sizeBytes: row.sizeBytes, name: row.originalName, extension: row.extension, isPublic: row.isPublic };
}
