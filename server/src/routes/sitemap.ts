import { Router } from "express";
import { prisma } from "../utils/prisma.js";

const SITE = process.env.PUBLIC_SITE_URL ?? "https://www.unosujata.com";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Dynamic sitemap: static pages, every category, and every published product. */
export const sitemapRouter = Router();

sitemapRouter.get("/sitemap.xml", async (_req, res, next) => {
  try {
    const [categories, products, industries] = await Promise.all([
      prisma.productCategory.findMany({ where: { archivedAt: null }, select: { slug: true, updatedAt: true } }),
      prisma.product.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
      prisma.industry.findMany({ select: { slug: true, updatedAt: true } }),
    ]);

    const urls: { loc: string; lastmod?: Date; priority: string }[] = [
      { loc: "/", priority: "1.0" },
      { loc: "/products", priority: "0.9" },
      { loc: "/request-quote", priority: "0.9" },
      { loc: "/industries", priority: "0.8" },
      { loc: "/capabilities", priority: "0.8" },
      { loc: "/quality", priority: "0.7" },
      { loc: "/about", priority: "0.6" },
      { loc: "/resources", priority: "0.7" },
      { loc: "/faq", priority: "0.7" },
      { loc: "/contact", priority: "0.6" },
      ...industries.map((i) => ({ loc: `/industries/${i.slug}`, lastmod: i.updatedAt, priority: "0.7" })),
      ...categories.map((c) => ({ loc: `/products/category/${c.slug}`, lastmod: c.updatedAt, priority: "0.8" })),
      ...products.map((p) => ({ loc: `/products/${p.slug}`, lastmod: p.updatedAt, priority: "0.7" })),
    ];

    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(
        (u) =>
          `  <url><loc>${esc(SITE + u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.toISOString().slice(0, 10)}</lastmod>` : ""}<priority>${u.priority}</priority></url>`
      ),
      "</urlset>",
    ].join("\n");

    res.type("application/xml").send(body);
  } catch (err) {
    next(err);
  }
});
