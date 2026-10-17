import type { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { HttpError } from "../utils/http.js";
import { checkFileBytes, extensionOf, MAX_FILE_BYTES, MAX_FILES_PER_RFQ, sanitizeFilename } from "../lib/files.js";
import { formatRfqNumber, generateAccessToken, hashToken, tokenMatches } from "../lib/rfqNumber.js";
import type { RfqSubmission } from "../lib/rfqSchema.js";
import { sha256, removeUpload, writeUpload } from "./storage.js";
import { sendRfqEmails, type EmailProvider } from "./email/index.js";

const UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

export const STATUS_LABELS: Record<string, string> = {
  NEW: "Received",
  UNDER_REVIEW: "Under review",
  TECHNICAL_REVIEW: "Technical review",
  QUOTE_PREPARED: "Quote prepared",
  CLOSED: "Closed",
};

/** Stages one drawing before submission. Validated against its bytes, not the client's claims. */
export async function stageUpload(file: { originalname: string; buffer: Buffer; size: number }) {
  if (file.size > MAX_FILE_BYTES) {
    throw new HttpError(413, `File is too large. The maximum size is ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB.`);
  }
  const extension = extensionOf(file.originalname);
  const check = checkFileBytes(file.buffer, extension);
  if (!check.ok) throw new HttpError(422, check.reason);

  const storedName = await writeUpload(file.buffer, check.extension);
  try {
    const row = await prisma.pendingUpload.create({
      data: {
        originalName: sanitizeFilename(file.originalname),
        storedName,
        mimeType: check.mimeType,
        extension: check.extension,
        sizeBytes: file.size,
        sha256: sha256(file.buffer),
        expiresAt: new Date(Date.now() + UPLOAD_TTL_MS),
      },
    });
    return { id: row.id, name: row.originalName, extension: row.extension, sizeBytes: row.sizeBytes };
  } catch (err) {
    await removeUpload(storedName).catch(() => undefined); // do not leave orphaned files
    throw err;
  }
}

export async function discardUpload(id: string) {
  const row = await prisma.pendingUpload.findUnique({ where: { id } });
  if (!row) return; // already gone: discarding is idempotent
  await prisma.pendingUpload.delete({ where: { id } });
  await removeUpload(row.storedName).catch(() => undefined);
}

export interface SubmitResult {
  rfqNumber: string;
  status: string;
  createdAt: Date;
  /** Returned only on the first successful submission. Not stored in plain text. */
  accessToken?: string;
}

/**
 * Creates an RFQ. Everything happens in one transaction: the server-side sequence number,
 * the RFQ, its products and attachments. Retrying with the same Idempotency-Key returns the original RFQ.
 */
export async function submitRfq(
  input: RfqSubmission,
  idempotencyKey: string | undefined,
  provider: EmailProvider
): Promise<SubmitResult> {
  if (idempotencyKey) {
    const existing = await prisma.rFQ.findUnique({ where: { idempotencyKey } });
    if (existing) return { rfqNumber: existing.rfqNumber, status: existing.status, createdAt: existing.createdAt };
  }

  if (input.attachmentIds.length > MAX_FILES_PER_RFQ) throw new HttpError(422, "Attach up to 5 files");

  // Products: every slug must be a published product, so the RFQ cannot reference invented items.
  const products = input.productSlugs.length
    ? await prisma.product.findMany({
        where: { slug: { in: input.productSlugs }, published: true },
        select: { id: true, name: true, productCode: true, category: { select: { name: true } } },
      })
    : [];
  if (products.length !== new Set(input.productSlugs).size) {
    throw new HttpError(422, "Some selected products are no longer available", { productSlugs: ["Unknown product"] });
  }

  // Attachments: must exist, be unexpired and not yet attached.
  const pending = input.attachmentIds.length
    ? await prisma.pendingUpload.findMany({ where: { id: { in: input.attachmentIds } } })
    : [];
  const now = Date.now();
  if (pending.length !== new Set(input.attachmentIds).size || pending.some((p) => p.expiresAt.getTime() < now)) {
    throw new HttpError(422, "Some files have expired. Please upload them again.", { attachmentIds: ["Upload expired"] });
  }

  const token = generateAccessToken();
  const year = new Date().getUTCFullYear();

  // A concurrent request with the same key may win the race. Its RFQ is returned instead of a second one.
  const outcome = await prisma
    .$transaction(async (tx) => {
    // Atomic increment: the row lock makes concurrent submissions take distinct numbers.
    const counter = await tx.rfqCounter.upsert({
      where: { year },
      create: { year, value: 1 },
      update: { value: { increment: 1 } },
    });

    const data: Prisma.RFQCreateInput = {
      rfqNumber: formatRfqNumber(year, counter.value),
      idempotencyKey: idempotencyKey ?? null,
      tokenHash: hashToken(token),
      name: input.name,
      company: input.company,
      email: input.email,
      phone: input.phone,
      country: input.country,
      industry: input.industry ?? null,
      partNumber: input.partNumber ?? null,
      quantity: input.quantity ?? null,
      material: input.material ?? null,
      finish: input.finish ?? null,
      application: input.application ?? null,
      deliveryRequirement: input.deliveryRequirement ?? null,
      message: input.message,
      attachments: {
        create: pending.map((p) => ({
          originalName: p.originalName,
          storedName: p.storedName,
          mimeType: p.mimeType,
          extension: p.extension,
          sizeBytes: p.sizeBytes,
          sha256: p.sha256,
        })),
      },
      products: {
        create: products.map((p) => ({
          productId: p.id,
          productNameSnapshot: p.name,
          productCodeSnapshot: p.productCode,
          categorySnapshot: p.category.name,
        })),
      },
    };

    const created = await tx.rFQ.create({ data });
    await tx.pendingUpload.deleteMany({ where: { id: { in: pending.map((p) => p.id) } } });
    return created;
    })
    .then((rfq) => ({ duplicate: false as const, rfq }))
    .catch(async (err: unknown) => {
      if (idempotencyKey && isUniqueViolation(err)) {
        const existing = await prisma.rFQ.findUnique({ where: { idempotencyKey } });
        if (existing) return { duplicate: true as const, rfq: existing };
      }
      throw err;
    });

  if (outcome.duplicate) {
    const { rfq: existing } = outcome;
    return { rfqNumber: existing.rfqNumber, status: existing.status, createdAt: existing.createdAt };
  }
  const rfq = outcome.rfq;

  await sendRfqEmails(provider, {
    rfqNumber: rfq.rfqNumber,
    name: rfq.name,
    company: rfq.company,
    email: rfq.email,
    phone: rfq.phone,
    country: rfq.country,
    industry: rfq.industry ?? undefined,
    productNames: products.map((p) => p.name),
    quantity: rfq.quantity ?? undefined,
    material: rfq.material ?? undefined,
    finish: rfq.finish ?? undefined,
    application: rfq.application ?? undefined,
    deliveryRequirement: rfq.deliveryRequirement ?? undefined,
    message: rfq.message,
    attachmentCount: pending.length,
    submittedAt: rfq.createdAt,
  });

  return { rfqNumber: rfq.rfqNumber, status: rfq.status, createdAt: rfq.createdAt, accessToken: token };
}

/**
 * Customer-safe view of an RFQ. Requires the access token issued at submission.
 * Unknown numbers and wrong tokens get the same response, so the endpoint cannot be used to find valid numbers.
 */
export async function getPublicRfq(rfqNumber: string, token: string) {
  const notFound = () => new HttpError(404, "We could not find that request. Check the reference and try again.");
  const rfq = await prisma.rFQ.findUnique({
    where: { rfqNumber },
    select: {
      rfqNumber: true,
      status: true,
      createdAt: true,
      tokenHash: true,
      products: { select: { productNameSnapshot: true } },
    },
  });
  if (!rfq) throw notFound();
  if (!tokenMatches(token, rfq.tokenHash)) throw notFound();

  return {
    rfqNumber: rfq.rfqNumber,
    status: rfq.status,
    statusLabel: STATUS_LABELS[rfq.status] ?? "In progress",
    submittedAt: rfq.createdAt,
    productNames: rfq.products.map((p) => p.productNameSnapshot),
  };
}

/** Removes expired staged uploads and their files. Run on a schedule. */
export async function cleanupExpiredUploads(): Promise<number> {
  const expired = await prisma.pendingUpload.findMany({ where: { expiresAt: { lt: new Date() } } });
  for (const row of expired) {
    await removeUpload(row.storedName).catch(() => undefined);
    await prisma.pendingUpload.delete({ where: { id: row.id } }).catch(() => undefined);
  }
  return expired.length;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}
