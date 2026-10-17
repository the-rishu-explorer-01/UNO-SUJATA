import { prisma } from "../utils/prisma.js";
import { productService } from "./product.service.js";
import { tokenize } from "./productFilters.js";
import { PAGE_INDEX } from "./site-index.js";
import { normalizeQuery } from "../lib/searchQuery.js";

export { normalizeQuery, MAX_QUERY } from "../lib/searchQuery.js";

const PER_GROUP = 5;

/** Every term must appear in at least one of the given fields. Parameterised by Prisma. */
function termsWhere(terms: string[], fields: string[]) {
  return {
    AND: terms.map((t) => ({
      OR: fields.map((f) => ({ [f]: { contains: t, mode: "insensitive" as const } })),
    })),
  };
}

export async function globalSearch(raw: string | undefined) {
  const query = normalizeQuery(raw);
  const terms = tokenize(query);
  if (terms.length === 0) {
    return { query, products: [], categories: [], industries: [], capabilities: [], resources: [], pages: [] };
  }

  const [productRes, categories, industries, capabilities, resources] = await Promise.all([
    productService.list({ search: query, page: 1, limit: PER_GROUP }),
    prisma.productCategory.findMany({
      where: { archivedAt: null, ...termsWhere(terms, ["name", "summary"]) },
      orderBy: { sortOrder: "asc" },
      take: PER_GROUP,
      select: { slug: true, name: true, summary: true },
    }),
    prisma.industry.findMany({
      where: termsWhere(terms, ["name", "summary"]),
      orderBy: { sortOrder: "asc" },
      take: PER_GROUP,
      select: { slug: true, name: true, summary: true },
    }),
    prisma.capability.findMany({
      where: termsWhere(terms, ["title", "description"]),
      orderBy: { sortOrder: "asc" },
      take: PER_GROUP,
      select: { slug: true, title: true, description: true },
    }),
    // Only resources with an uploaded, checked file are searchable.
    prisma.resource.findMany({
      where: { published: true, fileUrl: { not: null }, ...termsWhere(terms, ["title", "description"]) },
      orderBy: { sortOrder: "asc" },
      take: PER_GROUP,
      select: { slug: true, title: true, description: true, type: true },
    }),
  ]);

  const pages = PAGE_INDEX.filter((p) => {
    const hay = [p.title, ...p.keywords].join(" ").toLowerCase();
    return terms.every((t) => hay.includes(t.toLowerCase()));
  }).slice(0, PER_GROUP);

  return {
    query,
    products: productRes.items.map((p) => ({ slug: p.slug, name: p.name, categoryName: p.categoryName, productCode: p.productCode })),
    categories: categories.map((c) => ({ slug: c.slug, name: c.name, summary: c.summary })),
    industries: industries.map((i) => ({ slug: i.slug, name: i.name, summary: i.summary })),
    capabilities: capabilities.map((c) => ({ slug: c.slug, title: c.title, description: c.description })),
    resources: resources.map((r) => ({ slug: r.slug, title: r.title, description: r.description, type: r.type })),
    pages: pages.map((p) => ({ title: p.title, path: p.path })),
  };
}

/** Suggestions shown before the user types: real categories and the main pages. */
export async function searchSuggestions() {
  const categories = await prisma.productCategory.findMany({
    where: { archivedAt: null },
    orderBy: { sortOrder: "asc" },
    take: 6,
    select: { slug: true, name: true },
  });
  return {
    categories,
    pages: PAGE_INDEX.filter((p) => ["Products", "Industries", "Capabilities", "Quality", "Resources", "FAQ", "Request a quote"].includes(p.title)).map((p) => ({ title: p.title, path: p.path })),
  };
}
