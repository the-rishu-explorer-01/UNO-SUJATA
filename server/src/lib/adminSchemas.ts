import { z } from "zod";
import { RFQ_STATUSES } from "./rfqStatus.js";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./passwords.js";

/** Route ids are database cuids. Anything else is rejected before it reaches Prisma. */
export const idParam = z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/, "Invalid id");

const str = (max: number, min = 0) => z.string().trim().min(min).max(max);
const optStr = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

/** Query strings arrive as text, so numbers are coerced and bounded. */
export const pagination = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const loginBody = z.object({
  email: z.string().trim().max(254).email("Enter a valid email"),
  password: z.string().min(1, "Enter your password").max(MAX_PASSWORD_LENGTH),
});

export const passwordChangeBody = z.object({
  currentPassword: z.string().min(1).max(MAX_PASSWORD_LENGTH),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`).max(MAX_PASSWORD_LENGTH),
});

export const rfqListQuery = pagination.extend({
  search: optStr(100),
  status: z.enum(RFQ_STATUSES).optional(),
});

export const rfqStatusBody = z.object({ status: z.enum(RFQ_STATUSES) });

export const productListQuery = pagination.extend({
  search: optStr(100),
  state: z.enum(["active", "archived", "all"]).default("active"),
  categoryId: idParam.optional(),
});

const specRow = z.object({ label: str(80, 1), value: str(300) });

export const productBody = z.object({
  name: str(160, 2),
  slug: optStr(120),
  productCode: z.string().trim().max(80).optional().transform((v) => (v ? v : null)),
  productType: str(80, 2),
  description: str(4000, 10),
  categoryId: idParam,
  materialIds: z.array(idParam).max(10).default([]),
  applicationIds: z.array(idParam).max(10).default([]),
  processIds: z.array(idParam).max(10).default([]),
  finishes: z.array(str(80, 1)).max(20).default([]),
  specifications: z.array(specRow).max(40).default([]),
  verified: z.boolean().default(false),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
});

export const imageAltField = z.string().trim().min(2, "Describe the image").max(200);

export const categoryBody = z.object({
  name: str(80, 2),
  summary: str(300),
});

export const reorderBody = z.object({ ids: z.array(idParam).min(1).max(200) });

export const industryBody = z.object({ name: str(80, 2), summary: str(300) });
export const capabilityBody = z.object({ title: str(120, 2), description: str(400) });

export const contentBody = z.object({ value: z.unknown() });

export const userCreateBody = z.object({
  email: z.string().trim().max(254).email("Enter a valid email"),
  name: str(120, 2),
  role: z.enum(["ADMIN", "EDITOR"]),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
});

export const userUpdateBody = z
  .object({
    role: z.enum(["ADMIN", "EDITOR"]).optional(),
    active: z.boolean().optional(),
    /** Administrator-set password reset. The target's sessions are revoked when this is used. */
    password: z.string().min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`).max(MAX_PASSWORD_LENGTH).optional(),
  })
  .refine((v) => v.role !== undefined || v.active !== undefined || v.password !== undefined, "Nothing to change");

export const contactListQuery = pagination.extend({ status: z.enum(["NEW", "HANDLED"]).optional() });

/** Public contact form. Honeypot included. */
export const publicContactBody = z.object({
  name: str(120, 2),
  email: z.string().trim().max(254).email("Enter a valid email"),
  company: optStr(160),
  message: str(3000, 10),
  website: z.string().max(0).optional(),
});

// ---- Resources and FAQ ----
// Literal tuples, so the parsed value matches Prisma's enum types exactly.
const RESOURCE_TYPE_VALUES = ["CATALOGUE", "TECHNICAL", "BROCHURE", "QUALITY", "APPLICATION"] as const;
const FAQ_CATEGORY_VALUES = ["ORDERING", "CUSTOM_PARTS", "MATERIALS", "DRAWINGS", "RFQ_PROCESS", "QUALITY", "PACKAGING"] as const;

export const resourceBody = z.object({
  title: str(160, 3),
  type: z.enum(RESOURCE_TYPE_VALUES),
  description: str(600, 10),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  published: z.boolean().default(false),
});

export const faqBody = z.object({
  question: str(300, 8),
  answer: str(3000, 10),
  category: z.enum(FAQ_CATEGORY_VALUES),
  published: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

/** Search box input. Only the length and format are checked here; the service cleans the text. */
export const searchQuery = z.object({
  q: z.string().max(200).optional(),
});
