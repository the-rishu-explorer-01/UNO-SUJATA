import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);

export const HOMEPAGE_SECTION_KEYS = ["trust", "intro", "products", "custom", "industries", "journey", "quality", "cta"] as const;

/**
 * Every CMS key, with its validation schema and a default.
 * Defaults only use facts already verified from the company website. Unknown values are left empty, not invented.
 */
export const CONTENT_SCHEMAS = {
  "homepage.hero": z.object({
    eyebrow: text(120),
    headlineLine1: text(80),
    headlineLine2: text(80),
    supporting: text(600),
    primaryCta: text(40),
    secondaryCta: text(40),
  }),
  "homepage.stats": z.object({
    items: z.array(z.object({ value: text(20), label: text(80) })).max(6),
  }),
  "homepage.sections": z.object({
    sections: z.array(z.object({ key: z.enum(HOMEPAGE_SECTION_KEYS), enabled: z.boolean() })).max(20),
  }),
  quality: z.object({
    title: text(120),
    intro: text(800),
    /**
     * Certifications are entered by staff only, with the issuer and reference, so they can be checked.
     * Nothing is listed until it is entered here.
     */
    certifications: z
      .array(
        z.object({
          name: text(120),
          issuer: text(160),
          reference: text(80),
          validUntil: text(40),
        })
      )
      .max(20)
      .default([]),
  }),
  about: z.object({ headline: text(160), body: text(4000) }),
  contact: z.object({
    phone: text(60),
    email: z.string().trim().email("Enter a valid email").max(254).or(z.literal("")),
    address: text(400),
    hours: text(200),
  }),
} as const;

export type ContentKey = keyof typeof CONTENT_SCHEMAS;
export const CONTENT_KEYS = Object.keys(CONTENT_SCHEMAS) as ContentKey[];

export const CONTENT_DEFAULTS: { [K in ContentKey]: z.infer<(typeof CONTENT_SCHEMAS)[K]> } = {
  "homepage.hero": {
    eyebrow: "Manufacturing since 1978 · Jamnagar, Gujarat, India",
    headlineLine1: "PRECISION BRASS COMPONENTS.",
    headlineLine2: "ENGINEERED FOR INDUSTRY.",
    supporting: "",
    primaryCta: "Request a Quote",
    secondaryCta: "Explore Products",
  },
  "homepage.stats": {
    items: [
      { value: "1978", label: "Manufacturing since" },
      { value: "100,000", label: "Sq. ft. facility area" },
      { value: "120", label: "Workforce" },
    ],
  },
  "homepage.sections": {
    sections: HOMEPAGE_SECTION_KEYS.map((key) => ({ key, enabled: true })),
  },
  quality: {
    title: "Inspected to print",
    intro:
      "Each product is manufactured exactly to the print. Our quality control focuses on inspection against the drawing, supported by measuring instruments.",
    certifications: [],
  },
  about: {
    headline: "Built on brass. Driven by precision.",
    body:
      "Sujata began in 1978 serving the brass industry from a 200 square foot workshop in Jamnagar, Gujarat. Over the decades the business grew into a family company with about 100,000 square feet of facility and a workforce of around 120. Today it manufactures brass electrical, automotive, gas and industrial components for customers who supply to the wider market.",
  },
  contact: {
    phone: "+91 288 2570995 / 2570096",
    email: "info@sujatabrass.com",
    address: "Plot no. 50, B/H Essar Petrol Pump, Industrial Area, Jamnagar - Rajkot Hwy, Hapa, Gujarat 361120",
    hours: "",
  },
};

export function isContentKey(key: string): key is ContentKey {
  return (CONTENT_KEYS as string[]).includes(key);
}

/** Stored value merged over defaults, so a new key never breaks the page. */
