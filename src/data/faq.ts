/**
 * FAQ entries. Only factual answers are published.
 *
 * A question is left OUT when the company website and this application do not support an answer.
 * For example: lead times, payment terms, packing methods and certifications. Add them only when the
 * client has confirmed the answer, through the admin (Content → FAQ) or here.
 */
export interface FaqSeed {
  question: string;
  answer: string;
  category: "ORDERING" | "CUSTOM_PARTS" | "MATERIALS" | "DRAWINGS" | "RFQ_PROCESS" | "QUALITY" | "PACKAGING";
}

export const faqEntries: FaqSeed[] = [
  {
    question: "Is there a minimum order quantity?",
    answer:
      "We do not publish a minimum order quantity. Quantities are agreed during the quote, based on the part and its material. Give your expected quantity in the quote form.",
    category: "ORDERING",
  },
  {
    question: "Do you export?",
    answer:
      "The company describes itself as India's third largest exporter of brass and copper parts. Tell us your destination country in the quote form.",
    category: "ORDERING",
  },
  {
    question: "Do you make custom components?",
    answer:
      "Yes. We make tailor-made brass components from your drawing, sample or specification. We also make turned, forged and machined components to customer drawings.",
    category: "CUSTOM_PARTS",
  },
  {
    question: "What do I need to send for a custom part?",
    answer:
      "A drawing, a sample, a specification or a description of the application. You can send several of these together.",
    category: "CUSTOM_PARTS",
  },
  {
    question: "What material are your components made from?",
    answer:
      "Our range is centred on brass, and includes non-ferrous turned components. The material for each part is confirmed during engineering review. If you need a specific alloy, say so in the quote form.",
    category: "MATERIALS",
  },
  {
    question: "Which drawing file formats can I send?",
    answer:
      "PDF, STEP (.step and .stp), DWG, DXF, JPG and PNG. You can attach up to 5 files, each up to 10 MB.",
    category: "DRAWINGS",
  },
  {
    question: "Can I send a sample instead of a drawing?",
    answer:
      "Yes. A sample, a clear specification or a description of the application can be used in place of a drawing.",
    category: "DRAWINGS",
  },
  {
    question: "How does the quote process work?",
    answer:
      "Fill in the quote form and attach any drawings. You receive a reference number straight away, in the form RFQ-SUJ-, followed by the year and a sequence number. Our team reviews the request and replies by email.",
    category: "RFQ_PROCESS",
  },
  {
    question: "How do you check quality?",
    answer:
      "Each product is manufactured to the print. Dimensions are checked against the drawing using our measuring instruments. The quality page describes each inspection stage.",
    category: "QUALITY",
  },
];

/** Display labels, in the order the FAQ page shows them. Mirrors server/src/lib/faqCategories.ts. */
export const FAQ_CATEGORY_LABELS: Record<FaqSeed["category"], string> = {
  ORDERING: "Ordering",
  CUSTOM_PARTS: "Custom components",
  MATERIALS: "Materials",
  DRAWINGS: "Drawings and files",
  RFQ_PROCESS: "The quote process",
  QUALITY: "Quality",
  PACKAGING: "Packaging and delivery",
};
