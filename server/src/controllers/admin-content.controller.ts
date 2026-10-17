import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, z } from "zod";
import * as faq from "../services/faq.service.js";
import * as resources from "../services/resource.service.js";
import * as schemas from "../lib/adminSchemas.js";
import { HttpError } from "../utils/http.js";

function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data);
  if (!r.success) throw new HttpError(422, "Please check the highlighted fields.", r.error.flatten().fieldErrors);
  return r.data;
}

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

function actor(req: Request): string {
  if (!req.admin) throw new HttpError(401, "Please sign in to continue.");
  return req.admin.id;
}

export const adminContentController = {
  listFaqs: wrap(async (_req, res) => {
    res.json(await faq.adminFaqs());
  }),
  createFaq: wrap(async (req, res) => {
    res.status(201).json(await faq.createFaq(actor(req), parse(schemas.faqBody, req.body)));
  }),
  updateFaq: wrap(async (req, res) => {
    await faq.updateFaq(actor(req), parse(schemas.idParam, req.params.id), parse(schemas.faqBody, req.body));
    res.status(204).end();
  }),
  deleteFaq: wrap(async (req, res) => {
    await faq.deleteFaq(actor(req), parse(schemas.idParam, req.params.id));
    res.status(204).end();
  }),

  listResources: wrap(async (_req, res) => {
    res.json(await resources.adminResources());
  }),
  createResource: wrap(async (req, res) => {
    res.status(201).json(await resources.createResource(actor(req), parse(schemas.resourceBody, req.body)));
  }),
  updateResource: wrap(async (req, res) => {
    const body = parse(schemas.resourceBody, req.body);
    await resources.updateResource(actor(req), parse(schemas.idParam, req.params.id), body);
    res.status(204).end();
  }),
  uploadResourceFile: wrap(async (req, res) => {
    if (!req.file) throw new HttpError(422, "Choose a PDF to upload.");
    res.status(201).json(await resources.uploadResourceFile(actor(req), parse(schemas.idParam, req.params.id), req.file));
  }),
  deleteResource: wrap(async (req, res) => {
    await resources.deleteResource(actor(req), parse(schemas.idParam, req.params.id));
    res.status(204).end();
  }),
};
