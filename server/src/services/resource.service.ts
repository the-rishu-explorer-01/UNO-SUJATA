import { prisma } from "../utils/prisma.js";
import { HttpError } from "../utils/http.js";
import { RESOURCE_TYPES, type ResourceTypeValue } from "../lib/faqCategories.js";
import { slugify } from "../lib/slug.js";
import { audit } from "./audit.service.js";
import { removeImage, storeDocument } from "./media.service.js";

/** Public list: only resources with an uploaded, checked file. Grouped in the agreed type order. */
export async function publicResources() {
  const rows = await prisma.resource.findMany({
    where: { published: true, fileUrl: { not: null } },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: { slug: true, title: true, type: true, description: true, fileUrl: true, fileName: true, sizeBytes: true, updatedAt: true },
  });
  return RESOURCE_TYPES.map((t) => ({
    value: t.value,
    label: t.label,
    items: rows.filter((r) => r.type === t.value),
  })).filter((g) => g.items.length > 0);
}

export async function adminResources() {
  return prisma.resource.findMany({
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }],
    select: { id: true, slug: true, title: true, type: true, description: true, fileUrl: true, fileName: true, sizeBytes: true, published: true, sortOrder: true, updatedAt: true },
  });
}

export async function createResource(actorId: string, input: { title: string; type: ResourceTypeValue; description: string; sortOrder: number }) {
  const slug = slugify(input.title);
  if (!slug) throw new HttpError(422, "Enter a title with letters or numbers.", { title: ["Invalid title"] });
  try {
    // Created unpublished: publishing needs a file.
    const row = await prisma.resource.create({ data: { ...input, slug, published: false }, select: { id: true } });
    await audit({ actorId, action: "resource.created", entityType: "Resource", entityId: row.id, summary: `Added resource ${input.title}` });
    return row;
  } catch (err) {
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
      throw new HttpError(409, "A resource with this title already exists.", { title: ["Already in use"] });
    }
    throw err;
  }
}

export async function updateResource(actorId: string, id: string, input: { title: string; type: ResourceTypeValue; description: string; sortOrder: number; published: boolean }) {
  const current = await prisma.resource.findUnique({ where: { id }, select: { fileUrl: true } });
  if (!current) throw new HttpError(404, "Resource not found");
  if (input.published && !current.fileUrl) {
    throw new HttpError(422, "Upload the document before publishing it.", { published: ["Upload a file first"] });
  }
  await prisma.resource.update({ where: { id }, data: input });
  await audit({ actorId, action: "resource.updated", entityType: "Resource", entityId: id, summary: `${input.published ? "Published" : "Saved"} resource ${input.title}` });
}

export async function uploadResourceFile(actorId: string, id: string, file: { buffer: Buffer; size: number; originalname: string }) {
  const current = await prisma.resource.findUnique({ where: { id }, select: { title: true, fileUrl: true } });
  if (!current) throw new HttpError(404, "Resource not found");
  const stored = await storeDocument(file);
  const fileName = `${slugify(current.title) || "document"}.pdf`;
  await prisma.resource.update({ where: { id }, data: { fileUrl: stored.url, fileName, sizeBytes: stored.sizeBytes } });
  // Replacing a file removes the old one, so no stale copies stay public.
  if (current.fileUrl) await removeImage(current.fileUrl).catch(() => undefined);
  await audit({ actorId, action: "resource.file_uploaded", entityType: "Resource", entityId: id, summary: `Uploaded file for ${current.title}` });
  return { fileUrl: stored.url, fileName, sizeBytes: stored.sizeBytes };
}

export async function deleteResource(actorId: string, id: string) {
  const current = await prisma.resource.findUnique({ where: { id }, select: { title: true, fileUrl: true } });
  if (!current) throw new HttpError(404, "Resource not found");
  await prisma.resource.delete({ where: { id } });
  if (current.fileUrl) await removeImage(current.fileUrl).catch(() => undefined);
  await audit({ actorId, action: "resource.deleted", entityType: "Resource", entityId: id, summary: `Deleted resource ${current.title}` });
}
