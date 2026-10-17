import fs from "node:fs";
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as files from "../services/product-file.service.js";
import { PRODUCT_FILE_KINDS } from "../lib/productFileRules.js";
import { idParam } from "../lib/adminSchemas.js";
import { HttpError } from "../utils/http.js";

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

/** Route ids that fail validation are a not-found, not a server error. */
function idOr404(v: unknown): string {
  const r = idParam.safeParse(v);
  if (!r.success) throw new HttpError(404, "Not found");
  return r.data;
}

function actor(req: Request): string {
  if (!req.admin) throw new HttpError(401, "Please sign in to continue.");
  return req.admin.id;
}

const uploadFields = z.object({
  kind: z.enum(PRODUCT_FILE_KINDS),
  label: z.string().trim().max(80).optional(),
  isPublic: z.enum(["true", "false"]).optional(),
});

const patchBody = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  isPublic: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

function stream(res: Response, file: { fullPath: string; mimeType: string; sizeBytes: number; name: string; extension: string }, opts: { inline: boolean; cache: string }) {
  res.setHeader("Content-Type", file.mimeType);
  res.setHeader("Content-Length", String(file.sizeBytes));
  // Non-ASCII-safe filename; the name was sanitised at upload time.
  const ascii = file.name.replace(/[^\x20-\x7e]/g, "_");
  res.setHeader("Content-Disposition", `${opts.inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", opts.cache);
  const s = fs.createReadStream(file.fullPath);
  s.on("error", () => {
    if (!res.headersSent) res.status(500).json({ error: "File unavailable", code: "SERVER_ERROR" });
    else res.destroy();
  });
  s.pipe(res);
}

export const productFileController = {
  /** Admin: list every file on a product, with its approval state. */
  adminList: wrap(async (req, res) => {
    res.json(await files.listAdminFiles(idOr404(req.params.id)));
  }),

  adminUpload: wrap(async (req, res) => {
    if (!req.file) throw new HttpError(422, "Choose a file to upload.");
    const fields = uploadFields.safeParse(req.body ?? {});
    if (!fields.success) throw new HttpError(422, "Choose the kind of file.", fields.error.flatten().fieldErrors);
    const created = await files.uploadFile(
      actor(req),
      idOr404(req.params.id),
      { kind: fields.data.kind, label: fields.data.label || "", isPublic: fields.data.isPublic === "true" },
      req.file
    );
    res.status(201).json(created);
  }),

  adminUpdate: wrap(async (req, res) => {
    const parsed = patchBody.safeParse(req.body ?? {});
    if (!parsed.success) throw new HttpError(422, "Check the highlighted fields.", parsed.error.flatten().fieldErrors);
    await files.updateFile(actor(req), idOr404(req.params.id), parsed.data);
    res.status(204).end();
  }),

  adminDelete: wrap(async (req, res) => {
    await files.deleteFile(actor(req), idOr404(req.params.id));
    res.status(204).end();
  }),

  /** Admin preview or download. Never cached by shared caches. */
  adminDownload: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const f = await files.openFile(idOr404(req.params.id), { publicOnly: false });
      stream(res, f, { inline: req.query.inline === "1" && f.extension === "pdf", cache: "private, no-store" });
    } catch (err) {
      next(err);
    }
  },

  /** Public: approved files only. */
  publicList: wrap(async (req, res) => {
    const slug = String(req.params.slug);
    if (!/^[a-z0-9-]{1,120}$/.test(slug)) throw new HttpError(404, "Product not found");
    res.json(await files.listPublicFiles(slug));
  }),

  publicDownload: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const f = await files.openFile(idOr404(req.params.id), { publicOnly: true });
      stream(res, f, { inline: f.extension === "pdf" || f.extension === "glb", cache: "public, max-age=300" });
    } catch (err) {
      next(err);
    }
  },
};
