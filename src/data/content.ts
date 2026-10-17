import type { Capability, Industry } from "@/types/catalog";

/**
 * Industries are limited to sectors implied by the source site's product lines
 * (electrical, automotive, gas, fasteners). Add others only after client confirmation.
 */
export const industries: Industry[] = [
  { slug: "electrical", name: "Electrical", summary: "Pins, plug pins, socket pins, terminals and MCB components." },
  { slug: "automotive", name: "Automotive", summary: "Automobile parts, carburettor screw adjusts, fuel jets and nozzles." },
  { slug: "gas-equipment", name: "Gas Equipment", summary: "Brass gas parts for gas equipment applications." },
  { slug: "hardware-fasteners", name: "Fasteners & Hardware", summary: "Grub screws, nuts and fasteners." },
  { slug: "industrial", name: "Industrial Engineering", summary: "Turned, forged and machined components to customer drawings." },
];

export const capabilities: Capability[] = [
  { slug: "turning", title: "Non-ferrous turning", description: "Turned brass and copper-alloy components." },
  { slug: "forging-machining", title: "Forged & machined components", description: "Forging followed by machining." },
  { slug: "custom-to-drawing", title: "Built to your drawing", description: "Tailor-made components from your drawing, sample or specification." },
  { slug: "inspection-to-print", title: "Inspection to print", description: "Each product is checked to match the print." },
  { slug: "measurement", title: "Measuring instruments", description: "In-house measuring instruments for dimensional checks." },
];

export const journeySteps = [
  { no: "01", title: "Requirement", text: "You share a drawing, sample, specification or application need." },
  { no: "02", title: "Engineering Review", text: "Our engineers review feasibility and manufacturability." },
  { no: "03", title: "Material Selection", text: "We confirm the brass alloy suited to the application." },
  { no: "04", title: "Machining", text: "Components are turned, forged and machined to print." },
  { no: "05", title: "Inspection", text: "Dimensional checks at each stage against the drawing." },
  { no: "06", title: "Finishing", text: "Finishing as specified for your application." },
  { no: "07", title: "Packaging", text: "Packed to protect parts through transit." },
  { no: "08", title: "Dispatch", text: "Shipped to your facility on schedule." },
];

export const qualityChecks = [
  { title: "Material Inspection", text: "Incoming material checked before production starts." },
  { title: "Dimensional Inspection", text: "Parts measured against the customer drawing." },
  { title: "In-Process Inspection", text: "Checks during machining, not only at the end." },
  { title: "Final Inspection", text: "Finished lots verified before dispatch." },
  { title: "Quality Documentation", text: "Inspection records available on request." },
  { title: "Traceability", text: "Lots tracked from material to dispatch." },
];
