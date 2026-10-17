import { prisma } from "../utils/prisma.js";
import { HttpError } from "../utils/http.js";
import { audit } from "./audit.service.js";

export async function createContactEnquiry(input: { name: string; email: string; company?: string; message: string }) {
  return prisma.contactEnquiry.create({ data: input, select: { id: true } });
}

export async function listContacts(params: { status?: "NEW" | "HANDLED"; page: number; limit: number }) {
  const where = params.status ? { status: params.status } : {};
  const [total, items] = await prisma.$transaction([
    prisma.contactEnquiry.count({ where }),
    prisma.contactEnquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      select: { id: true, name: true, email: true, company: true, message: true, status: true, createdAt: true, handledAt: true },
    }),
  ]);
  return { items, total, page: params.page, limit: params.limit, totalPages: Math.max(1, Math.ceil(total / params.limit)) };
}

export async function markContactHandled(actorId: string, id: string) {
  const row = await prisma.contactEnquiry.findUnique({ where: { id }, select: { status: true } });
  if (!row) throw new HttpError(404, "Enquiry not found");
  if (row.status === "HANDLED") return;
  await prisma.contactEnquiry.update({ where: { id }, data: { status: "HANDLED", handledAt: new Date() } });
  await audit({ actorId, action: "contact.handled", entityType: "ContactEnquiry", entityId: id, summary: "Marked enquiry as handled" });
}
