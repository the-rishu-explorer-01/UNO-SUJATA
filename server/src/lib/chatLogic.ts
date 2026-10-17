/**
 * Pure chatbot logic: intent detection, keyword extraction, grounding records and fallback replies.
 * No database, no network. Tested in server/test/chat.test.ts.
 *
 * Rule: nothing in a reply may state a specification, price, stock level, certification or capability
 * that is not in the product record or the company's published content. When in doubt the reply says
 * the sales team will confirm.
 */

export type ChatIntent = "greeting" | "quote" | "custom" | "contact" | "capabilities" | "product";

const RULES: [ChatIntent, RegExp][] = [
  ["greeting", /^\s*(hi|hello|hey|namaste|good (morning|afternoon|evening))\b/i],
  ["quote", /\b(quot\w*|rfq|pric\w*|rates?|enquir\w*|inquir\w*|order)\b/i],
  ["custom", /\b(custom\w*|bespoke|tailor\w*|drawing|samples?|develop\w*)\b/i],
  ["contact", /\b(contact|sales team|salesperson|call|phone|email|speak|talk|reach)\b/i],
  ["capabilities", /\b(capabilit\w*|cnc|vmc|turning|multi.?slider|machin\w*|tolerances?|capacit\w*|processes?)\b/i],
];

export function classifyIntent(text: string): ChatIntent {
  for (const [intent, rule] of RULES) if (rule.test(text)) return intent;
  return "product";
}

const STOPWORDS = new Set([
  "the", "and", "for", "you", "your", "can", "want", "need", "looking", "find", "show", "have", "with", "from",
  "what", "which", "where", "how", "this", "that", "there", "about", "some", "any", "please", "would", "like",
  "give", "tell", "make", "made", "are", "is", "do", "does", "get", "its", "our", "one", "two", "need", "help",
  "brass", "part", "parts", "component", "components", "product", "products", "price", "quote", "quotation",
]);

/**
 * Words worth searching for. Part-number-like tokens (containing a digit) come first, because they are the most specific.
 * "brass" and similar generic words are excluded, since every product matches them.
 */
export function extractKeywords(text: string, max = 3): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9.\-/\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.\-/]+|[.\-/]+$/g, ""))
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && /[a-z0-9]/.test(t));
  const unique = [...new Set(tokens)];
  const withDigits = unique.filter((t) => /\d/.test(t));
  const words = unique.filter((t) => !/\d/.test(t));
  return [...withDigits, ...words].slice(0, max);
}

export interface ChatProductRecord {
  slug: string;
  name: string;
  productCode: string | null;
  productType: string;
  description: string;
  categoryName: string;
  materials: string[];
  applications: string[];
  processes: string[];
  image: { url: string; alt: string } | null;
}

/** The only fields the assistant may use. Internal fields, files and notes are never included. */
export function toGrounding(p: ChatProductRecord) {
  return {
    name: p.name,
    partNumber: p.productCode,
    type: p.productType,
    category: p.categoryName,
    materials: p.materials,
    applications: p.applications,
    processes: p.processes,
    description: p.description,
    specificationsPublished: false,
  };
}

export function toCard(p: ChatProductRecord) {
  return {
    slug: p.slug,
    name: p.name,
    productCode: p.productCode,
    categoryName: p.categoryName,
    materials: p.materials,
    description: p.description,
    image: p.image,
  };
}

export function fallbackReply(intent: ChatIntent, matchCount: number): string {
  switch (intent) {
    case "greeting":
      return "Welcome to UNO SUJATA. Looking for a brass component or a custom-manufactured part? Tell me what you need, and I'll help you find the right solution.";
    case "quote":
      return "To request a quotation, use the form below. Give us the part number or product, the quantity and your requirements. Our sales team replies by email. We don't quote prices in this chat.";
    case "custom":
      return "Custom components are made to your drawing, sample or specification. Describe the part, or request a quotation with your drawing, and our engineers review what can be made before we quote.";
    case "contact":
      return "You can reach the UNO SUJATA sales team at the contact details on our Contact page. You can also request a quotation here, and we'll respond by email.";
    case "capabilities":
      return "Our capabilities are described on the Capabilities page. Machine specifications, tolerances and capacity for your specific part are confirmed by our sales team.";
    case "product":
      if (matchCount > 0) {
        return `I found ${matchCount} published product${matchCount === 1 ? "" : "s"} that may match. Each card shows only the details we publish. Anything else, including specifications for your part, is confirmed by our sales team.`;
      }
      return "I couldn't find a published product matching that. Try a part number, a material or a category, or describe the requirement and our sales team will review it.";
  }
}

export function suggestionsFor(intent: ChatIntent): string[] {
  const base = ["Explore products", "Request a quotation", "Custom manufacturing", "Contact sales"];
  if (intent === "product") return ["Show terminals", "Show electrical pins", "Request a quotation"];
  if (intent === "custom") return ["Send a drawing", "Request a quotation", "Contact sales"];
  return base;
}

export const SYSTEM_PROMPT = [
  "You are the UNO SUJATA Product Assistant, on the website of a brass components manufacturer in Jamnagar, Gujarat.",
  "Answer briefly, in plain professional English, in at most 120 words.",
  "Use ONLY the PRODUCT RECORDS provided below for product facts. If a record does not contain a detail the visitor asks for, say that the sales team will confirm it.",
  "Never state or estimate prices, delivery times, stock levels, certifications, tolerances, machine capacity or dimensions that are not in the records.",
  "Never claim that a quotation has been sent. Direct visitors to the quotation form on the site.",
  "Do not ask for personal information in the chat.",
].join("\n");
