/**
 * Catalogue seed data. Single source for the database seed and the frontend fallback.
 *
 * Provenance:
 * - Category and product names: sujatabrass.com (company website).
 * - Materials, applications, processes and product types are DERIVED from those names and
 *   categories. They are not confirmed specifications. Every product is marked
 *   verified: false until the client confirms its technical data.
 * - Unknown values are left empty so the UI shows "Available on request".
 * - Product codes are null until the client supplies them.
 */

export interface LookupSeed {
  slug: string;
  name: string;
}

export const categories = [
  { slug: "precision-turned", name: "Precision Turned Components", summary: "Non-ferrous turned parts, forged and machined components." },
  { slug: "electrical", name: "Electrical Components", summary: "Brass electrical parts and MCB components." },
  { slug: "automotive", name: "Automotive Components", summary: "Automobile parts, carburettor screw adjusts, fuel jets, nozzles and cable adjusters." },
  { slug: "gas", name: "Gas Components", summary: "Brass gas parts." },
  { slug: "fasteners", name: "Fasteners", summary: "Brass grub screws, nuts and fasteners." },
  { slug: "pins-terminals", name: "Pins & Terminals", summary: "Electrical pins, plug pins, socket pins, switch plug pins and terminals." },
  { slug: "bushes-spacers-washers", name: "Bushes, Spacers & Washers", summary: "Brass bushes, spacers and washers." },
  { slug: "molding-inserts", name: "Molding Inserts", summary: "Brass molding inserts." },
  { slug: "connectors", name: "Connectors", summary: "Brass connectors." },
  { slug: "custom", name: "Custom Components", summary: "Tailor-made brass components built to your drawing." },
];

export const materials: LookupSeed[] = [
  { slug: "brass", name: "Brass" },
  { slug: "non-ferrous-alloy", name: "Non-ferrous alloy" },
];

export const applications: LookupSeed[] = [
  { slug: "electrical", name: "Electrical" },
  { slug: "automotive", name: "Automotive" },
  { slug: "gas-equipment", name: "Gas Equipment" },
  { slug: "hardware-fasteners", name: "Hardware & Fasteners" },
  { slug: "moulded-assemblies", name: "Moulded Assemblies" },
  { slug: "industrial", name: "General Industrial" },
];

export const processes: LookupSeed[] = [
  { slug: "turning", name: "Turning" },
  { slug: "forging", name: "Forging" },
  { slug: "machining", name: "Machining" },
];

export interface ProductSeed {
  slug: string;
  name: string;
  categorySlug: string;
  productType: string;
  materials: string[];
  applications: string[];
  processes: string[];
}

export const products: ProductSeed[] = [
  { slug: "non-ferrous-turned-components", name: "Non Ferrous Turned Components", categorySlug: "precision-turned", productType: "Turned component", materials: ["non-ferrous-alloy"], applications: ["industrial"], processes: ["turning"] },
  { slug: "forged-and-machine-components", name: "Forged and Machine Components", categorySlug: "precision-turned", productType: "Forged component", materials: ["non-ferrous-alloy"], applications: ["industrial"], processes: ["forging", "machining"] },
  { slug: "ball-pen-parts", name: "Ball Pen Parts", categorySlug: "precision-turned", productType: "Turned component", materials: ["brass"], applications: ["industrial"], processes: [] },
  { slug: "brass-electrical-parts", name: "Brass Electrical Parts", categorySlug: "electrical", productType: "Electrical part", materials: ["brass"], applications: ["electrical"], processes: [] },
  { slug: "mcb-components", name: "MCB Components", categorySlug: "electrical", productType: "Component", materials: ["brass"], applications: ["electrical"], processes: [] },
  { slug: "automobile-parts", name: "Brass Automobile Parts", categorySlug: "automotive", productType: "Automotive part", materials: ["brass"], applications: ["automotive"], processes: [] },
  { slug: "carburettor-screw-adjusts", name: "Carburettor Screw Adjusts", categorySlug: "automotive", productType: "Screw adjuster", materials: ["brass"], applications: ["automotive"], processes: [] },
  { slug: "fuel-jets", name: "Fuel Jets", categorySlug: "automotive", productType: "Jet", materials: ["brass"], applications: ["automotive"], processes: [] },
  { slug: "nozzles", name: "Nozzles", categorySlug: "automotive", productType: "Nozzle", materials: ["brass"], applications: ["automotive"], processes: [] },
  { slug: "cable-adjuster", name: "Cable Adjuster", categorySlug: "automotive", productType: "Adjuster", materials: ["brass"], applications: ["automotive"], processes: [] },
  { slug: "brass-gas-parts", name: "Brass Gas Parts", categorySlug: "gas", productType: "Gas part", materials: ["brass"], applications: ["gas-equipment"], processes: [] },
  { slug: "brass-grub-screws", name: "Brass Grub Screws", categorySlug: "fasteners", productType: "Screw", materials: ["brass"], applications: ["hardware-fasteners"], processes: [] },
  { slug: "nuts", name: "Nuts", categorySlug: "fasteners", productType: "Nut", materials: ["brass"], applications: ["hardware-fasteners"], processes: [] },
  { slug: "fasteners", name: "Fasteners", categorySlug: "fasteners", productType: "Fastener", materials: ["brass"], applications: ["hardware-fasteners"], processes: [] },
  { slug: "electrical-pins", name: "Electrical Pins", categorySlug: "pins-terminals", productType: "Pin", materials: ["brass"], applications: ["electrical"], processes: [] },
  { slug: "electrical-plug-pins", name: "Electrical Plug Pins", categorySlug: "pins-terminals", productType: "Pin", materials: ["brass"], applications: ["electrical"], processes: [] },
  { slug: "electrical-socket-pins", name: "Electrical Socket Pins", categorySlug: "pins-terminals", productType: "Pin", materials: ["brass"], applications: ["electrical"], processes: [] },
  { slug: "switch-plug-pins", name: "Switch Plug Pins", categorySlug: "pins-terminals", productType: "Pin", materials: ["brass"], applications: ["electrical"], processes: [] },
  { slug: "terminals", name: "Terminals", categorySlug: "pins-terminals", productType: "Terminal", materials: ["brass"], applications: ["electrical"], processes: [] },
  { slug: "bushes", name: "Bushes", categorySlug: "bushes-spacers-washers", productType: "Bush", materials: ["brass"], applications: ["industrial"], processes: [] },
  { slug: "spacers", name: "Spacers", categorySlug: "bushes-spacers-washers", productType: "Spacer", materials: ["brass"], applications: ["industrial"], processes: [] },
  { slug: "washers", name: "Washers", categorySlug: "bushes-spacers-washers", productType: "Washer", materials: ["brass"], applications: ["hardware-fasteners"], processes: [] },
  { slug: "molding-inserts", name: "Brass Molding Inserts", categorySlug: "molding-inserts", productType: "Insert", materials: ["brass"], applications: ["moulded-assemblies"], processes: [] },
  { slug: "connectors", name: "Connectors", categorySlug: "connectors", productType: "Connector", materials: ["brass"], applications: ["electrical"], processes: [] },
  { slug: "tailor-made-brass-components", name: "Tailor Made Brass Components", categorySlug: "custom", productType: "Custom component", materials: ["brass"], applications: ["industrial"], processes: [] },
];

/** Placeholder description until the client supplies one per product. */
export function describeProduct(p: ProductSeed): string {
  return `${p.name} manufactured to customer drawing or specification. Detailed technical data is available on request.`;
}
