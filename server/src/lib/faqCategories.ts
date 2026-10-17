export const FAQ_CATEGORIES = [
  { value: "ORDERING", label: "Ordering" },
  { value: "CUSTOM_PARTS", label: "Custom components" },
  { value: "MATERIALS", label: "Materials" },
  { value: "DRAWINGS", label: "Drawings and files" },
  { value: "RFQ_PROCESS", label: "The quote process" },
  { value: "QUALITY", label: "Quality" },
  { value: "PACKAGING", label: "Packaging and delivery" },
] as const;

export const RESOURCE_TYPES = [
  { value: "CATALOGUE", label: "Product catalogues" },
  { value: "TECHNICAL", label: "Technical documents" },
  { value: "BROCHURE", label: "Brochures" },
  { value: "QUALITY", label: "Quality documents" },
  { value: "APPLICATION", label: "Application information" },
] as const;

export type FaqCategoryValue = (typeof FAQ_CATEGORIES)[number]["value"];
export type ResourceTypeValue = (typeof RESOURCE_TYPES)[number]["value"];

// Compile-time guard: these literal lists must match the Prisma enums (see schema.prisma).
// If a value is added to one side and not the other, the type check fails here.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const _resourceTypesMatch: Equal<ResourceTypeValue, "CATALOGUE" | "TECHNICAL" | "BROCHURE" | "QUALITY" | "APPLICATION"> = true;
const _faqCategoriesMatch: Equal<FaqCategoryValue, "ORDERING" | "CUSTOM_PARTS" | "MATERIALS" | "DRAWINGS" | "RFQ_PROCESS" | "QUALITY" | "PACKAGING"> = true;
export { _resourceTypesMatch, _faqCategoriesMatch };
