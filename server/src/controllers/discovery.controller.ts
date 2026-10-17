import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { globalSearch, searchSuggestions } from "../services/search.service.js";
import { publicFaqs } from "../services/faq.service.js";
import { publicResources } from "../services/resource.service.js";
import { HttpError } from "../utils/http.js";

/** Search results change with the catalogue, so a short shared cache is safe. */
function cache(res: Response, seconds: number) {
  res.set("Cache-Control", `public, max-age=${seconds}, stale-while-revalidate=300`);
}

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const discoveryController = {
  /**
   * GET /api/search?q=... Results are never cached (they depend on the query), and the query is
   * not logged or stored. Responses carry no-store so shared caches do not keep what people searched for.
   */
  search: wrap(async (req, res) => {
    const parsed = z.object({ q: z.string().max(200).optional() }).safeParse(req.query);
    if (!parsed.success) throw new HttpError(422, "Check your search and try again.");
    res.set("Cache-Control", "private, no-store");
    res.json(await globalSearch(parsed.data.q));
  }),

  suggestions: wrap(async (_req, res) => {
    cache(res, 300);
    res.json(await searchSuggestions());
  }),

  resources: wrap(async (_req, res) => {
    cache(res, 60);
    res.json(await publicResources());
  }),

  faqs: wrap(async (_req, res) => {
    cache(res, 300);
    res.json(await publicFaqs());
  }),
};
