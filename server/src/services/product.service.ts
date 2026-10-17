import type { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { HttpError } from "../utils/http.js";
import { buildWhere, MAX_LIMIT, type ListParams } from "./productFilters.js";

export { buildWhere, tokenize, MAX_LIMIT, type ListParams } from "./productFilters.js";

const listSelect = {
  slug: true,
  name: true,
  productCode: true,
  productType: true,
  description: true,
  category: { select: { slug: true, name: true } },
  materials: { select: { name: true } },
  applications: { select: { name: true } },
  processes: { select: { name: true } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true, alt: true, width: true, height: true } },
} satisfies Prisma.ProductSelect;

type ListRow = Prisma.ProductGetPayload<{ select: typeof listSelect }>;

function toSummary(p: Pick<ListRow, "slug" | "name" | "productCode" | "productType" | "description" | "category" | "materials" | "applications" | "processes" | "images">) {
  const img = p.images[0];
  return {
    slug: p.slug,
    name: p.name,
    productCode: p.productCode,
    productType: p.productType,
    description: p.description,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    materials: p.materials.map((m) => m.name),
    applications: p.applications.map((a) => a.name),
    processes: p.processes.map((x) => x.name),
    image: img ? { url: img.url, alt: img.alt, width: img.width, height: img.height } : null,
  };
}

export const productService = {
  async list(params: ListParams) {
    const where = buildWhere(params);
    const limit = Math.min(Math.max(params.limit, 1), MAX_LIMIT);
    const page = Math.max(params.page, 1);

    const [total, rows] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy: [{ name: "asc" }, { slug: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: listSelect,
      }),
    ]);

    return {
      items: rows.map(toSummary),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  async bySlug(slug: string) {
    const p = await prisma.product.findFirst({
      where: { slug, published: true },
      select: {
        ...listSelect,
        id: true,
        verified: true,
        finishes: true,
        specifications: true,
        images: { orderBy: { sortOrder: "asc" }, select: { url: true, alt: true, width: true, height: true } },
      },
    });
    if (!p) throw new HttpError(404, "Product not found");

    const related = await relatedFor(p.id, p.category.slug, {
      applications: p.applications.map((a) => a.name),
      processes: p.processes.map((x) => x.name),
      materials: p.materials.map((m) => m.name),
    });

    return {
      ...toSummary(p),
      finishes: p.finishes,
      specifications: (p.specifications as { label: string; value: string }[]) ?? [],
      verified: p.verified,
      images: p.images.map((i) => ({ url: i.url, alt: i.alt, width: i.width, height: i.height })),
      related,
    };
  },

  /** Filter options with live product counts. Shown in the sidebar. */
  async facets() {
    // Counts are computed from published products only. Filtered relation counts are avoided on purpose.
    const [materials, applications, processes, types] = await Promise.all([
      prisma.material.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true, products: { where: { published: true }, select: { id: true } } } }),
      prisma.application.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true, products: { where: { published: true }, select: { id: true } } } }),
      prisma.manufacturingProcess.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true, products: { where: { published: true }, select: { id: true } } } }),
      prisma.product.groupBy({ by: ["productType"], where: { published: true }, _count: { _all: true }, orderBy: { productType: "asc" } }),
    ]);
    const withCounts = <T extends { slug: string; name: string; products: { id: string }[] }>(rows: T[]) =>
      rows
        .map((r) => ({ slug: r.slug, name: r.name, count: r.products.length }))
        .filter((r) => r.count > 0);
    return {
      materials: withCounts(materials),
      applications: withCounts(applications),
      processes: withCounts(processes),
      types: types.map((t) => ({ slug: t.productType, name: t.productType, count: t._count._all })),
    };
  },
};

/**
 * Related products: same category first, then products sharing an application, process or material.
 * Excludes the current product. Capped at 4.
 */
async function relatedFor(
  productId: string,
  categorySlug: string,
  attrs: { applications: string[]; processes: string[]; materials: string[] }
) {
  const base: Prisma.ProductWhereInput = { published: true, id: { not: productId } };
  const picked: string[] = [];
  const out: ReturnType<typeof toSummary>[] = [];

  const add = async (where: Prisma.ProductWhereInput) => {
    if (out.length >= 4) return;
    const rows = await prisma.product.findMany({
      where: { AND: [base, where] },
      take: 8,
      orderBy: { name: "asc" },
      select: listSelect,
    });
    for (const r of rows) {
      if (out.length >= 4) break;
      if (picked.includes(r.slug)) continue;
      picked.push(r.slug);
      out.push(toSummary(r));
    }
  };

  await add({ category: { slug: categorySlug } });
  if (attrs.applications.length) await add({ applications: { some: { name: { in: attrs.applications } } } });
  if (attrs.processes.length) await add({ processes: { some: { name: { in: attrs.processes } } } });
  if (attrs.materials.length) await add({ materials: { some: { name: { in: attrs.materials } } } });

  return out;
}
