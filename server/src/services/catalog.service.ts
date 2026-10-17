import { prisma } from "../utils/prisma.js";

/** Lookup data for navigation, filters and the homepage. */
export const catalogService = {
  async categories() {
    const rows = await prisma.productCategory.findMany({
      where: { archivedAt: null },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true, summary: true, products: { select: { published: true } } },
    });
    // Count published products in code rather than relying on filtered relation counts.
    return rows.map((c) => ({
      slug: c.slug,
      name: c.name,
      summary: c.summary,
      productCount: c.products.filter((p) => p.published).length,
    }));
  },

  async materials() {
    return prisma.material.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } });
  },

  async applications() {
    return prisma.application.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } });
  },

  async processes() {
    return prisma.manufacturingProcess.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } });
  },

  async industries() {
    return prisma.industry.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true, summary: true } });
  },

  async capabilities() {
    return prisma.capability.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, title: true, description: true } });
  },
};
