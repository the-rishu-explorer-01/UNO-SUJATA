/**
 * Seeds the database from src/data so the database and frontend fallback stay in sync.
 * Run with: npm run db:seed
 * Idempotent: re-running updates existing rows by slug.
 */
import { PrismaClient } from "@prisma/client";
import {
  categories,
  materials,
  applications,
  processes,
  products,
  describeProduct,
} from "../../src/data/products";
import { industries, capabilities } from "../../src/data/content";
import { faqEntries } from "../../src/data/faq";

const prisma = new PrismaClient();

async function upsertLookups<T extends { slug: string; name: string }>(
  rows: T[],
  model: "material" | "application" | "manufacturingProcess"
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const r of rows) {
    const delegate = prisma[model] as unknown as {
      upsert: (args: unknown) => Promise<{ id: string }>;
    };
    const row = await delegate.upsert({
      where: { slug: r.slug },
      update: { name: r.name },
      create: { slug: r.slug, name: r.name },
    });
    ids.set(r.slug, row.id);
  }
  return ids;
}

async function main() {
  const materialIds = await upsertLookups(materials, "material");
  const applicationIds = await upsertLookups(applications, "application");
  const processIds = await upsertLookups(processes, "manufacturingProcess");

  const categoryIds = new Map<string, string>();
  for (const [i, c] of categories.entries()) {
    const row = await prisma.productCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name, summary: c.summary, sortOrder: i },
      create: { slug: c.slug, name: c.name, summary: c.summary, sortOrder: i },
    });
    categoryIds.set(c.slug, row.id);
  }

  for (const p of products) {
    const categoryId = categoryIds.get(p.categorySlug);
    if (!categoryId) throw new Error(`Unknown category "${p.categorySlug}" for product "${p.slug}"`);

    const ids = (slugs: string[], map: Map<string, string>) =>
      slugs.map((s) => {
        const id = map.get(s);
        if (!id) throw new Error(`Unknown lookup "${s}" for product "${p.slug}"`);
        return { id };
      });

    const relations = {
      materials: ids(p.materials, materialIds),
      applications: ids(p.applications, applicationIds),
      processes: ids(p.processes, processIds),
    };

    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        productType: p.productType,
        description: describeProduct(p),
        categoryId,
        materials: { set: relations.materials },
        applications: { set: relations.applications },
        processes: { set: relations.processes },
      },
      create: {
        slug: p.slug,
        name: p.name,
        productType: p.productType,
        description: describeProduct(p),
        verified: false,
        published: true,
        categoryId,
        materials: { connect: relations.materials },
        applications: { connect: relations.applications },
        processes: { connect: relations.processes },
      },
    });
  }

  for (const [i, ind] of industries.entries()) {
    await prisma.industry.upsert({
      where: { slug: ind.slug },
      update: { name: ind.name, summary: ind.summary, sortOrder: i },
      create: { slug: ind.slug, name: ind.name, summary: ind.summary, sortOrder: i },
    });
  }

  for (const [i, cap] of capabilities.entries()) {
    await prisma.capability.upsert({
      where: { slug: cap.slug },
      update: { title: cap.title, description: cap.description, sortOrder: i },
      create: { slug: cap.slug, title: cap.title, description: cap.description, sortOrder: i },
    });
  }

  await seedFaqs(prisma);

  console.log(
    `[seed] ${categories.length} categories, ${products.length} products, ${materials.length} materials, ${applications.length} applications, ${processes.length} processes`
  );
}

main()
  .catch((err) => {
    console.error("[seed] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

/** Factual FAQ answers. Entries come from src/data/faq.ts so the frontend fallback and the database match. */
export async function seedFaqs(db: PrismaClient) {
  const existing = await db.faqEntry.count();
  if (existing > 0) return; // do not overwrite entries edited in the admin
  let order = 0;
  for (const f of faqEntries) {
    await db.faqEntry.create({ data: { question: f.question, answer: f.answer, category: f.category, published: true, sortOrder: order++ } });
  }
  console.log(`[seed] ${faqEntries.length} FAQ entries`);
}
