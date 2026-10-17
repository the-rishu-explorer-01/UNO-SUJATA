import fs from "node:fs";
import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, z } from "zod";
import * as rfq from "../services/admin-rfq.service.js";
import * as catalog from "../services/admin-catalog.service.js";
import * as content from "../services/content.service.js";
import * as contacts from "../services/contact.service.js";
import * as users from "../services/user.service.js";
import * as dashboard from "../services/dashboard.service.js";
import { recentAudit } from "../services/audit.service.js";
import * as schemas from "../lib/adminSchemas.js";
import { HttpError } from "../utils/http.js";

/** Parses a request part with a schema and turns failures into a 422 with field messages. */
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

/** Actor is always taken from the authenticated session. Never from the request body. */
function actor(req: Request): string {
  if (!req.admin) throw new HttpError(401, "Please sign in to continue.");
  return req.admin.id;
}

const id = (req: Request) => parse(schemas.idParam, req.params.id);

export const adminController = {
  dashboard: wrap(async (_req, res) => {
    const [summary, activity] = await Promise.all([dashboard.dashboardSummary(), recentAudit(10)]);
    res.json({ ...summary, activity });
  }),

  // ---- RFQs ----
  listRfqs: wrap(async (req, res) => {
    res.json(await rfq.listRfqs(parse(schemas.rfqListQuery, req.query)));
  }),
  getRfq: wrap(async (req, res) => {
    res.json(await rfq.getRfq(id(req)));
  }),
  setRfqStatus: wrap(async (req, res) => {
    const body = parse(schemas.rfqStatusBody, req.body);
    res.json(await rfq.setRfqStatus(actor(req), id(req), body.status));
  }),
  /** Streams a drawing. Permission, existence and audit are all checked before any byte is sent. */
  downloadAttachment: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = await rfq.openAttachment(actor(req), id(req), parse(schemas.idParam, req.params.attachmentId));
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Length", String(file.sizeBytes));
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="drawing"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, no-store");
      const stream = fs.createReadStream(file.fullPath);
      stream.on("error", () => {
        if (!res.headersSent) res.status(500).json({ error: "File unavailable", code: "SERVER_ERROR" });
        else res.destroy();
      });
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  },

  // ---- Products ----
  listProducts: wrap(async (req, res) => {
    res.json(await catalog.listProducts(parse(schemas.productListQuery, req.query)));
  }),
  getProduct: wrap(async (req, res) => {
    res.json(await catalog.getProduct(id(req)));
  }),
  createProduct: wrap(async (req, res) => {
    const body = parse(schemas.productBody, req.body);
    res.status(201).json(await catalog.createProduct(actor(req), body));
  }),
  updateProduct: wrap(async (req, res) => {
    const body = parse(schemas.productBody, req.body);
    res.json(await catalog.updateProduct(actor(req), id(req), body));
  }),
  archiveProduct: wrap(async (req, res) => {
    await catalog.setProductArchived(actor(req), id(req), true);
    res.status(204).end();
  }),
  restoreProduct: wrap(async (req, res) => {
    await catalog.setProductArchived(actor(req), id(req), false);
    res.status(204).end();
  }),
  addProductImage: wrap(async (req, res) => {
    if (!req.file) throw new HttpError(422, "Choose an image to upload.");
    const alt = parse(schemas.imageAltField, req.body?.alt ?? "");
    res.status(201).json(await catalog.addProductImage(actor(req), id(req), req.file, alt));
  }),
  removeProductImage: wrap(async (req, res) => {
    await catalog.removeProductImage(actor(req), id(req), parse(schemas.idParam, req.params.imageId));
    res.status(204).end();
  }),

  // ---- Categories ----
  listCategories: wrap(async (_req, res) => {
    res.json(await catalog.listCategories());
  }),
  createCategory: wrap(async (req, res) => {
    res.status(201).json(await catalog.createCategory(actor(req), parse(schemas.categoryBody, req.body)));
  }),
  updateCategory: wrap(async (req, res) => {
    await catalog.updateCategory(actor(req), id(req), parse(schemas.categoryBody, req.body));
    res.status(204).end();
  }),
  archiveCategory: wrap(async (req, res) => {
    await catalog.setCategoryArchived(actor(req), id(req), true);
    res.status(204).end();
  }),
  restoreCategory: wrap(async (req, res) => {
    await catalog.setCategoryArchived(actor(req), id(req), false);
    res.status(204).end();
  }),
  reorderCategories: wrap(async (req, res) => {
    await catalog.reorderCategories(actor(req), parse(schemas.reorderBody, req.body).ids);
    res.status(204).end();
  }),

  // ---- Lookups, industries, capabilities ----
  lookups: wrap(async (_req, res) => {
    res.json(await catalog.listLookups());
  }),
  listIndustries: wrap(async (_req, res) => {
    res.json(await catalog.listIndustries());
  }),
  createIndustry: wrap(async (req, res) => {
    res.status(201).json(await catalog.createIndustry(actor(req), parse(schemas.industryBody, req.body)));
  }),
  updateIndustry: wrap(async (req, res) => {
    await catalog.updateIndustry(actor(req), id(req), parse(schemas.industryBody, req.body));
    res.status(204).end();
  }),
  listCapabilities: wrap(async (_req, res) => {
    res.json(await catalog.listCapabilities());
  }),
  createCapability: wrap(async (req, res) => {
    res.status(201).json(await catalog.createCapability(actor(req), parse(schemas.capabilityBody, req.body)));
  }),
  updateCapability: wrap(async (req, res) => {
    await catalog.updateCapability(actor(req), id(req), parse(schemas.capabilityBody, req.body));
    res.status(204).end();
  }),

  // ---- CMS content ----
  listContent: wrap(async (_req, res) => {
    res.json(await content.getContent());
  }),
  saveContent: wrap(async (req, res) => {
    const key = String(req.params.key);
    const body = parse(schemas.contentBody, req.body);
    res.json({ key, value: await content.saveContent(actor(req), key, body.value) });
  }),

  // ---- Contact enquiries ----
  listContacts: wrap(async (req, res) => {
    res.json(await contacts.listContacts(parse(schemas.contactListQuery, req.query)));
  }),
  markContactHandled: wrap(async (req, res) => {
    await contacts.markContactHandled(actor(req), id(req));
    res.status(204).end();
  }),

  // ---- Users (ADMIN only, enforced by route permission) ----
  listUsers: wrap(async (_req, res) => {
    res.json(await users.listUsers());
  }),
  createUser: wrap(async (req, res) => {
    res.status(201).json(await users.createUser(actor(req), parse(schemas.userCreateBody, req.body)));
  }),
  updateUser: wrap(async (req, res) => {
    res.json(await users.updateUser(actor(req), id(req), parse(schemas.userUpdateBody, req.body)));
  }),

  audit: wrap(async (req, res) => {
    const limit = parse(schemas.pagination, req.query).limit;
    res.json(await recentAudit(limit));
  }),
};
