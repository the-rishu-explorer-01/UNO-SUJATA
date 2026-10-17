import type { Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma.js";
import { HttpError } from "../utils/http.js";
import { audit } from "./audit.service.js";
import { removeImage, storeImage } from "./media.service.js";
import { slugify } from "../lib/slug.js";

export { slugify } from "../lib/slug.js";

export interface ProductInput {
  name: string;
  slug?: string;
  productCode?: string | null;
  productType: string;
  description: string;
  categoryId: string;
  materialIds: string[];
  applicationIds: string[];
  processIds: string[];
  finishes: string[];
  specifications: { label: string; value: string }[];
  verified: boolean;
  published: boolean;
  featured: boolean;
}

/** Turns a Prisma unique-constraint failure into a clear 409 instead of a 500. */
function mapUnique(err: unknown, field: string): never {
  if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
    throw new HttpError(409, `That ${field} is already in use.`, { [field]: [`Already in use`] });
  }
  throw err;
}

async function assertLookupsExist(input: ProductInput) {
  const checks: [string, string[], "material" | "application" | "manufacturingProcess"][] = [
    ["materialIds", input.materialIds, "material"],
    ["applicationIds", input.applicationIds, "application"],
    ["processIds", input.processIds, "manufacturingProcess"],
  ];
  for (const [field, ids, model] of checks) {
    if (ids.length === 0) continue;
    const delegate = prisma[model] as unknown as { count: (a: { where: { id: { in: string[] } } }) => Promise<number> };
    const found = await delegate.count({ where: { id: { in: ids } } });
    if (found !== new Set(ids).size) throw new HttpError(422, "One of the selected options no longer exists.", { [field]: ["Unknown option"] });
  }
  const category = await prisma.productCategory.findUnique({ where: { id: input.categoryId }, select: { id: true, archivedAt: true } });
  if (!category) throw new HttpError(422, "Choose a category.", { categoryId: ["Unknown category"] });
  if (category.archivedAt) throw new HttpError(422, "That category is archived. Restore it or choose another.", { categoryId: ["Archived category"] });
}

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  materials: { select: { id: true, name: true } },
  applications: { select: { id: true, name: true } },
  processes: { select: { id: true, name: true } },
  images: { orderBy: { sortOrder: "asc" as const }, select: { id: true, url: true, alt: true, sortOrder: true } },
} satisfies Prisma.ProductInclude;

export async function listProducts(params: { search?: string; state: "active" | "archived" | "all"; categoryId?: string; page: number; limit: number }) {
  const where: Prisma.ProductWhereInput = {};
  if (params.state === "active") where.archivedAt = null;
  if (params.state === "archived") where.archivedAt = { not: null };
  if (params.categoryId) where.categoryId = params.categoryId;
  const q = params.search?.trim();
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { productCode: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }];

  const [total, rows] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      select: {
        id: true, slug: true, name: true, productCode: true, productType: true, published: true,
        featured: true, verified: true, archivedAt: true, updatedAt: true,
        category: { select: { name: true } },
        _count: { select: { images: true } },
      },
    }),
  ]);
  return { items: rows.map((r) => ({ ...r, categoryName: r.category.name, imageCount: r._count.images })), total, page: params.page, limit: params.limit, totalPages: Math.max(1, Math.ceil(total / params.limit)) };
}

export async function getProduct(id: string) {
  const p = await prisma.product.findUnique({ where: { id }, include: productInclude });
  if (!p) throw new HttpError(404, "Product not found");
  return {
    id: p.id, slug: p.slug, name: p.name, productCode: p.productCode, productType: p.productType,
    description: p.description, verified: p.verified, published: p.published, featured: p.featured,
    archivedAt: p.archivedAt, finishes: p.finishes,
    specifications: (p.specifications as { label: string; value: string }[]) ?? [],
    categoryId: p.category.id, categoryName: p.category.name,
    materialIds: p.materials.map((m) => m.id), applicationIds: p.applications.map((a) => a.id), processIds: p.processes.map((x) => x.id),
    materialNames: p.materials.map((m) => m.name), applicationNames: p.applications.map((a) => a.name), processNames: p.processes.map((x) => x.name),
    images: p.images,
    updatedAt: p.updatedAt,
  };
}

export async function createProduct(actorId: string, input: ProductInput) {
  await assertLookupsExist(input);
  const slug = input.slug ? slugify(input.slug) : slugify(input.name);
  if (!slug) throw new HttpError(422, "Enter a product name that contains letters or numbers.", { name: ["Invalid name"] });
  try {
    const p = await prisma.product.create({
      data: {
        slug,
        name: input.name,
        productCode: input.productCode || null,
        productType: input.productType,
        description: input.description,
        verified: input.verified,
        published: input.published,
        featured: input.featured,
        finishes: input.finishes,
        specifications: input.specifications,
        categoryId: input.categoryId,
        materials: { connect: input.materialIds.map((id) => ({ id })) },
        applications: { connect: input.applicationIds.map((id) => ({ id })) },
        processes: { connect: input.processIds.map((id) => ({ id })) },
      },
      select: { id: true, slug: true },
    });
    await audit({ actorId, action: "product.created", entityType: "Product", entityId: p.id, summary: `Created ${input.name}` });
    return p;
  } catch (err) {
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
      const target = String((err as { meta?: { target?: unknown } }).meta?.target ?? "");
      mapUnique(err, target.includes("productCode") ? "product code" : "URL name");
    }
    throw err;
  }
}

export async function updateProduct(actorId: string, id: string, input: ProductInput) {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true, archivedAt: true, slug: true } });
  if (!existing) throw new HttpError(404, "Product not found");
  await assertLookupsExist(input);
  const slug = input.slug ? slugify(input.slug) : existing.slug;
  try {
    await prisma.product.update({
      where: { id },
      data: {
        slug,
        name: input.name,
        productCode: input.productCode || null,
        productType: input.productType,
        description: input.description,
        verified: input.verified,
        // An archived product stays hidden until restored.
        published: existing.archivedAt ? false : input.published,
        featured: input.featured,
        finishes: input.finishes,
        specifications: input.specifications,
        categoryId: input.categoryId,
        materials: { set: input.materialIds.map((x) => ({ id: x })) },
        applications: { set: input.applicationIds.map((x) => ({ id: x })) },
        processes: { set: input.processIds.map((x) => ({ id: x })) },
      },
    });
    const changedSlug = slug !== existing.slug;
    await audit({
      actorId,
      action: "product.updated",
      entityType: "Product",
      entityId: id,
      summary: changedSlug ? `Updated ${input.name}; URL changed from ${existing.slug} to ${slug}` : `Updated ${input.name}`,
    });
  } catch (err) {
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
      const target = String((err as { meta?: { target?: unknown } }).meta?.target ?? "");
      mapUnique(err, target.includes("productCode") ? "product code" : "URL name");
    }
    throw err;
  }
  return { id, slug };
}

export async function setProductArchived(actorId: string, id: string, archived: boolean) {
  const p = await prisma.product.findUnique({ where: { id }, select: { name: true, archivedAt: true, category: { select: { archivedAt: true } } } });
  if (!p) throw new HttpError(404, "Product not found");
  if (!archived && p.category.archivedAt) {
    throw new HttpError(422, "Restore the category first, then restore this product.");
  }
  await prisma.product.update({
    where: { id },
    data: archived ? { archivedAt: new Date(), published: false, featured: false } : { archivedAt: null, published: true },
  });
  await audit({ actorId, action: archived ? "product.archived" : "product.restored", entityType: "Product", entityId: id, summary: `${archived ? "Archived" : "Restored"} ${p.name}` });
}

export async function addProductImage(actorId: string, productId: string, file: { buffer: Buffer; size: number }, alt: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true, _count: { select: { images: true } } } });
  if (!product) throw new HttpError(404, "Product not found");
  if (product._count.images >= 10) throw new HttpError(422, "A product can have up to 10 images.");
  const { url } = await storeImage(file);
  const row = await prisma.productImage.create({
    data: { productId, url, alt, sortOrder: product._count.images },
    select: { id: true, url: true, alt: true, sortOrder: true },
  });
  await audit({ actorId, action: "product.image_added", entityType: "Product", entityId: productId, summary: `Added image to ${product.name}` });
  return row;
}

export async function removeProductImage(actorId: string, productId: string, imageId: string) {
  const img = await prisma.productImage.findFirst({ where: { id: imageId, productId }, select: { url: true } });
  if (!img) throw new HttpError(404, "Image not found");
  await prisma.productImage.delete({ where: { id: imageId } });
  await removeImage(img.url).catch(() => undefined);
  await audit({ actorId, action: "product.image_removed", entityType: "Product", entityId: productId, summary: "Removed an image" });
}

// ---------- Categories ----------

export async function listCategories() {
  const rows = await prisma.productCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true, summary: true, sortOrder: true, archivedAt: true, _count: { select: { products: true } } },
  });
  return rows.map(({ _count, ...r }) => ({ ...r, productCount: _count.products }));
}

export async function createCategory(actorId: string, input: { name: string; summary: string }) {
  const slug = slugify(input.name);
  if (!slug) throw new HttpError(422, "Enter a name with letters or numbers.", { name: ["Invalid name"] });
  const last = await prisma.productCategory.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  try {
    const c = await prisma.productCategory.create({ data: { slug, name: input.name, summary: input.summary, sortOrder: (last?.sortOrder ?? -1) + 1 }, select: { id: true, slug: true } });
    await audit({ actorId, action: "category.created", entityType: "ProductCategory", entityId: c.id, summary: `Created category ${input.name}` });
    return c;
  } catch (err) {
    mapUnique(err, "category name");
  }
}

/** The URL slug is fixed once created, so existing links keep working. */
export async function updateCategory(actorId: string, id: string, input: { name: string; summary: string }) {
  const c = await prisma.productCategory.findUnique({ where: { id }, select: { id: true } });
  if (!c) throw new HttpError(404, "Category not found");
  await prisma.productCategory.update({ where: { id }, data: { name: input.name, summary: input.summary } });
  await audit({ actorId, action: "category.updated", entityType: "ProductCategory", entityId: id, summary: `Updated category ${input.name}` });
}

export async function setCategoryArchived(actorId: string, id: string, archived: boolean) {
  const c = await prisma.productCategory.findUnique({ where: { id }, select: { name: true } });
  if (!c) throw new HttpError(404, "Category not found");
  if (archived) {
    const live = await prisma.product.count({ where: { categoryId: id, published: true, archivedAt: null } });
    if (live > 0) {
      throw new HttpError(422, `${c.name} still has ${live} live product${live === 1 ? "" : "s"}. Archive or move them first.`);
    }
  }
  await prisma.productCategory.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } });
  await audit({ actorId, action: archived ? "category.archived" : "category.restored", entityType: "ProductCategory", entityId: id, summary: `${archived ? "Archived" : "Restored"} ${c.name}` });
}

export async function reorderCategories(actorId: string, ids: string[]) {
  const existing = await prisma.productCategory.findMany({ where: { id: { in: ids } }, select: { id: true } });
  if (existing.length !== ids.length || new Set(ids).size !== ids.length) throw new HttpError(422, "The category list is out of date. Reload and try again.");
  await prisma.$transaction(ids.map((id, i) => prisma.productCategory.update({ where: { id }, data: { sortOrder: i } })));
  await audit({ actorId, action: "category.reordered", entityType: "ProductCategory", entityId: null, summary: `Reordered ${ids.length} categories` });
}

// ---------- Lookups ----------

export async function listLookups() {
  const [materials, applications, processes, categories] = await Promise.all([
    prisma.material.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.application.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.manufacturingProcess.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.productCategory.findMany({ where: { archivedAt: null }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true } }),
  ]);
  return { materials, applications, processes, categories };
}

// ---------- Industries and capabilities ----------

export async function listIndustries() {
  return prisma.industry.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, name: true, summary: true, sortOrder: true } });
}

export async function createIndustry(actorId: string, input: { name: string; summary: string }) {
  const slug = slugify(input.name);
  if (!slug) throw new HttpError(422, "Enter a name with letters or numbers.", { name: ["Invalid name"] });
  const last = await prisma.industry.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  try {
    const row = await prisma.industry.create({ data: { slug, name: input.name, summary: input.summary, sortOrder: (last?.sortOrder ?? -1) + 1 }, select: { id: true } });
    await audit({ actorId, action: "industry.created", entityType: "Industry", entityId: row.id, summary: `Created industry ${input.name}` });
    return row;
  } catch (err) {
    mapUnique(err, "industry name");
  }
}

export async function updateIndustry(actorId: string, id: string, input: { name: string; summary: string }) {
  await prisma.industry.update({ where: { id }, data: { name: input.name, summary: input.summary } }).catch(() => {
    throw new HttpError(404, "Industry not found");
  });
  await audit({ actorId, action: "industry.updated", entityType: "Industry", entityId: id, summary: `Updated industry ${input.name}` });
}

export async function listCapabilities() {
  return prisma.capability.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, slug: true, title: true, description: true, sortOrder: true } });
}

export async function createCapability(actorId: string, input: { title: string; description: string }) {
  const slug = slugify(input.title);
  if (!slug) throw new HttpError(422, "Enter a title with letters or numbers.", { title: ["Invalid title"] });
  const last = await prisma.capability.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  try {
    const row = await prisma.capability.create({ data: { slug, title: input.title, description: input.description, sortOrder: (last?.sortOrder ?? -1) + 1 }, select: { id: true } });
    await audit({ actorId, action: "capability.created", entityType: "Capability", entityId: row.id, summary: `Created capability ${input.title}` });
    return row;
  } catch (err) {
    mapUnique(err, "capability title");
  }
}

export async function updateCapability(actorId: string, id: string, input: { title: string; description: string }) {
  await prisma.capability.update({ where: { id }, data: { title: input.title, description: input.description } }).catch(() => {
    throw new HttpError(404, "Capability not found");
  });
  await audit({ actorId, action: "capability.updated", entityType: "Capability", entityId: id, summary: `Updated capability ${input.title}` });
}
