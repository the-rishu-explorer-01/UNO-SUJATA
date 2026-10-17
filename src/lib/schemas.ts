import { z } from "zod";

/**
 * Client-side RFQ rules. Mirrors server/src/lib/rfqSchema.ts for instant feedback.
 * The server validates again and is the authority. Keep the two in sync.
 */
const text = (min: number, max: number, message: string) =>
  z.string().trim().max(max, `Maximum ${max} characters`).refine((v) => v.length >= min, { message });

const optionalText = (max: number) => z.string().trim().max(max, `Maximum ${max} characters`);

export const rfqFormSchema = z.object({
  name: text(2, 120, "Enter your full name"),
  company: text(2, 160, "Enter your company name"),
  email: z
    .string()
    .trim()
    .max(254, "Enter a valid business email")
    .email("Enter a valid business email"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]{7,20}$/, "Enter a valid phone number, for example +91 98765 43210"),
  country: text(2, 80, "Enter your country"),
  industry: optionalText(80),
  product: z.string().max(120),                 // catalogue slug, or "" for not listed
  partNumber: optionalText(80),
  quantity: optionalText(120),
  material: optionalText(80),
  finish: optionalText(120),
  application: optionalText(120),
  deliveryRequirement: optionalText(120),
  message: text(20, 3000, "Describe your requirement in at least 20 characters"),
  consent: z.literal(true, { errorMap: () => ({ message: "Please confirm you agree to be contacted about this request" }) }),
  website: z.string().max(0).optional(), // honeypot
});

export type RfqFormValues = z.input<typeof rfqFormSchema>;
