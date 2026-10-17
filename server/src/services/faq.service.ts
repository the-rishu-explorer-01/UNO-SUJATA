import { prisma } from "../utils/prisma.js";
import { HttpError } from "../utils/http.js";
import { FAQ_CATEGORIES, type FaqCategoryValue } from "../lib/faqCategories.js";
import { audit } from "./audit.service.js";

/** Published FAQs grouped in the agreed category order. Empty categories are omitted. */
export async function publicFaqs() {
  const rows = await prisma.faqEntry.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, question: true, answer: true, category: true },
  });
  return FAQ_CATEGORIES.map((c) => ({
    value: c.value,
    label: c.label,
    items: rows.filter((r) => r.category === c.value).map((r) => ({ id: r.id, question: r.question, answer: r.answer })),
  })).filter((g) => g.items.length > 0);
}

export async function adminFaqs() {
  return prisma.faqEntry.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    select: { id: true, question: true, answer: true, category: true, published: true, sortOrder: true, updatedAt: true },
  });
}

export interface FaqInput {
  question: string;
  answer: string;
  category: FaqCategoryValue;
  published: boolean;
  sortOrder: number;
}

export async function createFaq(actorId: string, input: FaqInput) {
  const row = await prisma.faqEntry.create({ data: input, select: { id: true } });
  await audit({ actorId, action: "faq.created", entityType: "FaqEntry", entityId: row.id, summary: "Added FAQ entry" });
  return row;
}

export async function updateFaq(actorId: string, id: string, input: FaqInput) {
  const exists = await prisma.faqEntry.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HttpError(404, "FAQ entry not found");
  await prisma.faqEntry.update({ where: { id }, data: input });
  await audit({ actorId, action: "faq.updated", entityType: "FaqEntry", entityId: id, summary: `${input.published ? "Published" : "Saved draft of"} FAQ entry` });
}

export async function deleteFaq(actorId: string, id: string) {
  const exists = await prisma.faqEntry.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new HttpError(404, "FAQ entry not found");
  await prisma.faqEntry.delete({ where: { id } });
  await audit({ actorId, action: "faq.deleted", entityType: "FaqEntry", entityId: id, summary: "Deleted FAQ entry" });
}
