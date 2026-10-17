/**
 * Content for the corporate and manufacturing pages.
 *
 * SOURCES
 * - sujatabrass.com (company website): 1978 founding, 200 sq ft start, 100,000 sq ft today,
 *   120 workforce, Jamnagar / Hapa Industrial Area, product lines, "exactly to the print",
 *   measuring instruments, machine division, "India's third largest exporter" (company's own claim).
 * - Third-party directory listings were NOT used: their figures conflict with the company site.
 *
 * Lines marked CONFIRM describe how the company works rather than a verified fact.
 * They must be checked with the client before launch. Keep this list in step with README.
 */

export interface IndustryContent {
  slug: string;
  name: string;
  summary: string;
  requirement: string;
  components: string[];
  capability: string;
  /** Application slugs in the product catalogue used to find relevant products. */
  applicationSlugs: string[];
}

export const industryContent: IndustryContent[] = [
  {
    slug: "electrical",
    name: "Electrical",
    summary: "Pins, terminals and connectors that must fit existing assemblies without rework.",
    requirement:
      "Electrical manufacturers need contact and terminal parts with dimensions that repeat from batch to batch, so they fit existing assemblies without rework.",
    components: [
      "Brass electrical parts and MCB components",
      "Electrical pins, plug pins, socket pins and switch plug pins",
      "Terminals and connectors",
      "Brass molding inserts",
    ],
    capability: "Turned and machined brass parts made to your drawing, with dimensions checked against the print.",
    applicationSlugs: ["electrical", "moulded-assemblies"],
  },
  {
    slug: "automotive",
    name: "Automotive",
    summary: "Precision brass parts for carburettor and fuel systems, built to the drawing.",
    requirement:
      "Automotive manufacturers need small brass parts whose dimensions hold across production runs, with clear documentation against the drawing.",
    components: [
      "Brass automobile parts",
      "Carburettor screw adjusts",
      "Fuel jets and nozzles",
      "Cable adjusters",
    ],
    capability: "Brass parts manufactured to print, with dimensional inspection before dispatch.",
    applicationSlugs: ["automotive"],
  },
  {
    slug: "gas-equipment",
    name: "Gas Equipment",
    summary: "Brass gas parts for equipment makers who need consistent fitting dimensions.",
    requirement:
      "Gas equipment makers need brass parts that match the drawing exactly, so assembly lines run without adjustment.",
    components: ["Brass gas parts, made to customer drawing or specification"],
    capability: "Made to print, with the material and finish agreed during engineering review.",
    applicationSlugs: ["gas-equipment"],
  },
  {
    slug: "hardware-fasteners",
    name: "Fasteners & Hardware",
    summary: "Grub screws, nuts, fasteners and washers in brass.",
    requirement:
      "Assembly and hardware buyers need threads, sizes and finishes that stay consistent from one order to the next.",
    components: ["Brass grub screws", "Nuts and fasteners", "Washers"],
    capability: "Turned brass components to drawing, with inspection against the print.",
    applicationSlugs: ["hardware-fasteners"],
  },
  {
    slug: "industrial",
    name: "Industrial Engineering",
    summary: "Turned, forged and machined components for engineering teams, including custom parts.",
    requirement:
      "Engineering teams often need a part that does not exist in a catalogue: a turned, forged or machined component made to their own drawing.",
    components: [
      "Non-ferrous turned components",
      "Forged and machined components",
      "Bushes, spacers and washers",
      "Tailor-made brass components",
    ],
    capability: "Custom components from your drawing, sample or specification, reviewed by engineering before quoting.",
    applicationSlugs: ["industrial"],
  },
];

export const industryBySlug = (slug: string) => industryContent.find((i) => i.slug === slug);

// ---------- Capabilities ----------

export interface Step {
  title: string;
  text: string;
  /** "fact" = stated on the company website. "CONFIRM" = process description to verify with the client. */
  basis: "fact" | "CONFIRM";
}

export const capabilitySections: { heading: string; intro: string; steps: Step[] }[] = [
  {
    heading: "From requirement to quote",
    intro: "Every order starts with the part, not the machine.",
    steps: [
      { title: "Requirement", text: "Send a drawing, sample, specification or application need.", basis: "fact" },
      { title: "Engineering review", text: "Engineers review the requirement and confirm it can be made before a quote is issued.", basis: "CONFIRM" },
      { title: "Material selection", text: "We confirm the brass or non-ferrous material suited to the application.", basis: "fact" },
    ],
  },
  {
    heading: "Making the part",
    intro: "Turned and machined brass components, to the print.",
    steps: [
      { title: "Turning", text: "Non-ferrous turned components are a core product line.", basis: "fact" },
      { title: "Machining", text: "Forged and machined components are part of the range.", basis: "fact" },
      {
        title: "Automatic machining",
        text: "The Sujata group's machine division builds automatic machines (sliding head, single spindle and rotary table types). Ask us which automatic machining is available for your part.",
        basis: "fact",
      },
      { title: "Precision manufacturing", text: "Components are manufactured to the print, and dimensions are checked against the drawing.", basis: "fact" },
    ],
  },
  {
    heading: "Checking, finishing and delivery",
    intro: "Each order is checked against its drawing before it leaves.",
    steps: [
      { title: "Inspection", text: "Dimensional inspection against the print, using our measuring instruments.", basis: "fact" },
      { title: "Finishing", text: "Finish is taken from your drawing and confirmed during engineering review.", basis: "CONFIRM" },
      { title: "Packaging", text: "Packing method is agreed with you before production.", basis: "CONFIRM" },
      { title: "Dispatch", text: "Shipped to your facility.", basis: "CONFIRM" },
    ],
  },
];

// ---------- Quality ----------

export const qualityPrinciples: { title: string; text: string }[] = [
  { title: "Inspection to the print", text: "Each product is manufactured exactly to the print. Quality control is built around that rule." },
  { title: "Customer first", text: "We aim to deliver beyond what the customer expects, and to keep the promises we make." },
  { title: "Continuous improvement", text: "We treat every process as something that can be simplified or improved." },
];

export const qualityStages: { title: string; text: string; basis: "fact" | "CONFIRM" }[] = [
  { title: "Material inspection", text: "Incoming brass and non-ferrous material is checked before it goes into production.", basis: "CONFIRM" },
  { title: "Process inspection", text: "Checks during machining, so problems are caught while the batch is still in process.", basis: "CONFIRM" },
  { title: "Dimensional inspection", text: "Dimensions are measured against the drawing using our measuring instruments.", basis: "fact" },
  { title: "Final inspection", text: "Finished parts are checked before dispatch.", basis: "CONFIRM" },
  { title: "Documentation", text: "Inspection records for an order can be discussed with you as part of the quote.", basis: "CONFIRM" },
  { title: "Traceability", text: "Each batch is linked to its material, process and inspection records.", basis: "CONFIRM" },
];

// ---------- About ----------

export const timeline: { label: string; title: string; text: string }[] = [
  {
    label: "1978",
    title: "Foundation",
    text: "The company began serving the brass industry from a 200 sq. ft. workshop in Jamnagar.",
  },
  {
    label: "Growth",
    title: "Growth",
    text: "The business grew, and six other companies joined to form the Sujata Group of Companies.",
  },
  {
    label: "Expansion",
    title: "Expansion",
    text: "Our facility now covers about 100,000 sq. ft. at the Hapa Industrial Area, on the Jamnagar–Rajkot Highway.",
  },
  {
    label: "Today",
    title: "Today",
    text: "A family company with a workforce of about 120, serving electrical, automotive, gas and industrial customers.",
  },
  {
    label: "Now",
    title: "Modern manufacturing",
    text: "Turning, forging and machining to the print, with inspection against the drawing and a machine division within the group.",
  },
];

export const aboutFallbackBody =
  "Sujata began in 1978 serving the brass industry from a 200 square foot workshop in Jamnagar, Gujarat. Over the decades the business grew into a family company with about 100,000 square feet of facility and a workforce of around 120. Today it manufactures brass electrical, automotive, gas and industrial components for customers who supply to the wider market.";

export const qualityFallbackIntro =
  "Each product is manufactured exactly to the print. Our quality control focuses on inspection against the drawing, supported by measuring instruments.";

export const SITE_BASE = "https://www.unosujata.com";
