import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { catalogService } from "../services/catalog.service.js";
import { productService, MAX_LIMIT } from "../services/product.service.js";
import { HttpError } from "../utils/http.js";

/** Query-string schema. Repeated params (?material=a&material=b) and comma lists are both accepted. */
const multi = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    if (v === undefined) return [];
    const arr = Array.isArray(v) ? v : [v];
    return arr.flatMap((s) => s.split(",")).map((s) => s.trim()).filter(Boolean).slice(0, 20);
  });

const listQuery = z.object({
  search: z.string().max(200).optional(),
  category: z.string().max(80).optional(),
  material: multi,
  application: multi,
  process: multi,
  type: multi,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(12),
});

export const catalogController = {
  categories: wrap(async (_req, res) => {
    res.json(await catalogService.categories());
  }),
  materials: wrap(async (_req, res) => {
    res.json(await catalogService.materials());
  }),
  applications: wrap(async (_req, res) => {
    res.json(await catalogService.applications());
  }),
  processes: wrap(async (_req, res) => {
    res.json(await catalogService.processes());
  }),
  facets: wrap(async (_req, res) => {
    res.json(await productService.facets());
  }),
  industries: wrap(async (_req, res) => {
    res.json(await catalogService.industries());
  }),
  capabilities: wrap(async (_req, res) => {
    res.json(await catalogService.capabilities());
  }),

  products: wrap(async (req, res) => {
    const parsed = listQuery.safeParse(req.query);
    if (!parsed.success) throw new HttpError(422, "Invalid query", parsed.error.flatten().fieldErrors);
    res.json(await productService.list(parsed.data));
  }),

  productBySlug: wrap(async (req, res) => {
    res.json(await productService.bySlug(String(req.params.slug)));
  })
};

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/** Forwards async errors to the Express error middleware. */
function wrap(fn: Handler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
