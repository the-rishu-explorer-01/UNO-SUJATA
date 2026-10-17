import fs from "node:fs";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { HttpError } from "../utils/http.js";
import { uploadDir } from "./storage.js";
import { audit, auditFor } from "./audit.service.js";
import { RFQ_STATUSES, STATUS_TEXT, type RfqStatusValue } from "../lib/rfqStatus.js";

export { RFQ_STATUSES, STATUS_TEXT, type RfqStatusValue } from "../lib/rfqStatus.js";

export async function listRfqs(params: { search?: string; status?: RfqStatusValue; page: number; limit: number }) {
  const where: Prisma.RFQWhereInput = {};
  if (params.status) where.status = params.status;
  const q = params.search?.trim();
  if (q) {
    // Parameterised by Prisma: the search text is never interpolated into SQL.
    where.OR = [
      { rfqNumber: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { company: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  const [total, rows] = await prisma.$transaction([
    prisma.rFQ.count({ where }),
    prisma.rFQ.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      select: {
        id: true,
        rfqNumber: true,
        name: true,
        company: true,
        email: true,
        status: true,
        createdAt: true,
        products: { select: { productNameSnapshot: true }, take: 3 },
        _count: { select: { attachments: true } },
      },
    }),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      rfqNumber: r.rfqNumber,
      name: r.name,
      company: r.company,
      email: r.email,
      status: r.status,
      createdAt: r.createdAt,
      productNames: r.products.map((p) => p.productNameSnapshot),
      attachmentCount: r._count.attachments,
    })),
    total,
    page: params.page,
    limit: params.limit,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  };
}

export async function getRfq(id: string) {
  const rfq = await prisma.rFQ.findUnique({
    where: { id },
    select: {
      id: true,
      rfqNumber: true,
      name: true,
      company: true,
      email: true,
      phone: true,
      country: true,
      industry: true,
      partNumber: true,
      quantity: true,
      material: true,
      finish: true,
      application: true,
      deliveryRequirement: true,
      message: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      // tokenHash is deliberately not selected.
      attachments: { orderBy: { createdAt: "asc" }, select: { id: true, originalName: true, mimeType: true, extension: true, sizeBytes: true, createdAt: true } },
      products: { select: { id: true, productNameSnapshot: true, productCodeSnapshot: true, categorySnapshot: true, productId: true } },
    },
  });
  if (!rfq) throw new HttpError(404, "RFQ not found");
  const history = await auditFor("RFQ", id);
  return { ...rfq, history };
}

export async function setRfqStatus(actorId: string, id: string, status: RfqStatusValue) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.rFQ.findUnique({ where: { id }, select: { status: true, rfqNumber: true } });
    if (!current) throw new HttpError(404, "RFQ not found");
    if (current.status === status) return { status, changed: false };

    await tx.rFQ.update({ where: { id }, data: { status } });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "rfq.status_changed",
        entityType: "RFQ",
        entityId: id,
        summary: `Status changed from ${STATUS_TEXT[current.status as RfqStatusValue]} to ${STATUS_TEXT[status]}`,
      },
    });
    return { status, changed: true };
  });
}

/** Resolves an attachment for streaming. Access is checked here and audited, so every download leaves a record. */
export async function openAttachment(actorId: string, rfqId: string, attachmentId: string) {
  const att = await prisma.rFQAttachment.findFirst({
    where: { id: attachmentId, rfqId },
    select: { originalName: true, storedName: true, mimeType: true, sizeBytes: true, sha256: true },
  });
  if (!att) throw new HttpError(404, "File not found");

  // The stored name is server-generated, but it still must not be able to escape the upload directory.
  if (!/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/.test(att.storedName)) throw new HttpError(500, "File unavailable");
  const fullPath = path.join(uploadDir(), att.storedName);
  if (path.dirname(fullPath) !== uploadDir() || !fs.existsSync(fullPath)) throw new HttpError(404, "File not available");

  await audit({ actorId, action: "rfq.attachment_downloaded", entityType: "RFQ", entityId: rfqId, summary: `Downloaded ${att.originalName}` });
  return { ...att, fullPath };
}

export async function dashboardRfqCounts() {
  const now = Date.now();
  const day = 24 * 3600_000;
  const [newCount, openCount, thisWeek, lastWeek, byStatus, recent] = await Promise.all([
    prisma.rFQ.count({ where: { status: "NEW" } }),
    prisma.rFQ.count({ where: { status: { not: "CLOSED" } } }),
    prisma.rFQ.count({ where: { createdAt: { gte: new Date(now - 7 * day) } } }),
    prisma.rFQ.count({ where: { createdAt: { gte: new Date(now - 14 * day), lt: new Date(now - 7 * day) } } }),
    prisma.rFQ.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.rFQ.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, rfqNumber: true, company: true, status: true, createdAt: true },
    }),
  ]);
  return {
    newCount,
    openCount,
    thisWeek,
    lastWeek,
    byStatus: RFQ_STATUSES.map((s) => ({ status: s, label: STATUS_TEXT[s], count: byStatus.find((g) => g.status === s)?._count._all ?? 0 })),
    recent,
  };
}
