import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import * as customers from "../services/customer.service.js";
import { idParam } from "../lib/adminSchemas.js";
import { HttpError } from "../utils/http.js";

const customerBody = z.object({
  name: z.string().trim().min(2).max(160),
  billingAddress: z.string().trim().min(5).max(400),
  shippingAddress: z.string().trim().max(400).optional(),
  gstin: z.string().trim().toUpperCase().max(15).optional(),
  stateName: z.string().trim().min(2).max(80),
  stateCode: z.string().regex(/^\d{2}$/, "Choose a valid state code"),
  contactName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().max(254).email().optional().or(z.literal("")),
  active: z.boolean().default(true),
});

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

function actor(req: Request): string {
  if (!req.admin) throw new HttpError(401, "Please sign in to continue.");
  return req.admin.id;
}

function parseBody(data: unknown) {
  const r = customerBody.safeParse(data);
  if (!r.success) throw new HttpError(422, "Please check the highlighted fields.", r.error.flatten().fieldErrors);
  return { ...r.data, shippingAddress: r.data.shippingAddress || undefined, gstin: r.data.gstin || undefined, contactName: r.data.contactName || undefined, phone: r.data.phone || undefined, email: r.data.email || undefined };
}

export const customerController = {
  list: wrap(async (req, res) => {
    res.json(await customers.listCustomers(req.query.all === "1"));
  }),
  create: wrap(async (req, res) => {
    res.status(201).json(await customers.createCustomer(actor(req), parseBody(req.body)));
  }),
  update: wrap(async (req, res) => {
    const id = idParam.parse(req.params.id);
    await customers.updateCustomer(actor(req), id, parseBody(req.body));
    res.status(204).end();
  }),
};
