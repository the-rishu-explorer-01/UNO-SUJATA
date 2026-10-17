import { z } from "zod";
import { sanitizeLine, sanitizeText } from "./text.js";

/** Required text: trimmed, sanitised, then length-checked. */
const required = (min: number, max: number, message: string, multiline = false) =>
  z
    .string({ required_error: message, invalid_type_error: message })
    .max(max * 4, message) // reject absurd payloads before sanitising
    .transform((v) => (multiline ? sanitizeText(v, max) : sanitizeLine(v, max)))
    .refine((v) => v.length >= min, { message });

/** Optional text: blank becomes undefined. */
const optional = (max: number) =>
  z
    .string()
    .max(max * 4)
    .transform((v) => sanitizeLine(v, max))
    .transform((v) => (v.length ? v : undefined))
    .optional();

/**
 * Server-side RFQ schema. The client validates too, for usability only.
 * Every rule here is enforced regardless of what the browser sends.
 */
export const rfqSubmissionSchema = z.object({
  name: required(2, 120, "Enter your full name"),
  company: required(2, 160, "Enter your company name"),
  email: z
    .string({ required_error: "Enter your business email" })
    .trim()
    .max(254, "Enter a valid business email")
    .email("Enter a valid business email")
    .transform((v) => v.toLowerCase()),
  phone: z
    .string({ required_error: "Enter a phone number" })
    .trim()
    .regex(/^\+?[0-9\s()-]{7,20}$/, "Enter a valid phone number"),
  country: required(2, 80, "Enter your country"),
  industry: optional(80),
  productSlugs: z
    .array(z.string().regex(/^[a-z0-9-]{1,120}$/, "Unknown product"))
    .max(5, "Select up to 5 products")
    .default([]),
  partNumber: optional(80),
  quantity: optional(120),
  material: optional(80),
  finish: optional(120),
  application: optional(120),
  deliveryRequirement: optional(120),
  message: required(20, 3000, "Describe your requirement in at least 20 characters", true),
  attachmentIds: z
    .array(z.string().uuid("Invalid file reference"))
    .max(5, "Attach up to 5 files")
    .default([]),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Please confirm you agree to be contacted about this request" }),
  }),
  // Honeypot: real users never see or fill this field.
  website: z.string().max(0).optional(),
});

export type RfqSubmission = z.infer<typeof rfqSubmissionSchema>;
