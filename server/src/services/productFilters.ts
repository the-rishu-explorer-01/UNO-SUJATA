import type { Prisma } from "@prisma/client";

export interface ListParams {
  search?: string;
  category?: string;
  material?: string[];
  application?: string[];
  process?: string[];
  type?: string[];
  page: number;
  limit: number;
}

export const MAX_LIMIT = 48;

/** Split a free-text query into terms. Each term must match (AND across terms). */
export function tokenize(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s&-]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 6); // cap work per request
}

/**
 * A term matches a product if it appears in any searchable field.
 * Singular/plural is tolerant: "pins" also matches "pin".
 */
function termWhere(term: string): Prisma.ProductWhereInput {
  const variants = [term];
  if (term.length > 3 && term.endsWith("s")) variants.push(term.slice(0, -1));

  const ors: Prisma.ProductWhereInput[] = [];
  for (const v of variants) {
    ors.push(
      { name: { contains: v, mode: "insensitive" } },
      { productCode: { contains: v, mode: "insensitive" } },
      { productType: { contains: v, mode: "insensitive" } },
      { description: { contains: v, mode: "insensitive" } },
      { category: { name: { contains: v, mode: "insensitive" } } },
      { materials: { some: { name: { contains: v, mode: "insensitive" } } } },
      { applications: { some: { name: { contains: v, mode: "insensitive" } } } },
      { processes: { some: { name: { contains: v, mode: "insensitive" } } } }
    );
  }
  return { OR: ors };
}

/** Build the Prisma where clause from the query. Facets combine with AND; values within a facet with OR. */
export function buildWhere(p: ListParams): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [{ published: true }];

  if (p.category) and.push({ category: { slug: p.category } });
  if (p.material?.length) and.push({ materials: { some: { slug: { in: p.material } } } });
  if (p.application?.length) and.push({ applications: { some: { slug: { in: p.application } } } });
  if (p.process?.length) and.push({ processes: { some: { slug: { in: p.process } } } });
  if (p.type?.length) and.push({ productType: { in: p.type } });

  for (const term of tokenize(p.search ?? "")) and.push(termWhere(term));

  return { AND: and };
}
