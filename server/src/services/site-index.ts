/**
 * Public pages that search can return. Keep in step with the routes in src/App.tsx.
 * The test in server/test/discovery.test.ts checks the required paths are present.
 */
export interface PageEntry {
  title: string;
  path: string;
  keywords: string[];
}

export const PAGE_INDEX: PageEntry[] = [
  { title: "Home", path: "/", keywords: ["precision brass components", "jamnagar", "uno sujata"] },
  { title: "Products", path: "/products", keywords: ["catalogue", "range", "parts", "components"] },
  { title: "Industries", path: "/industries", keywords: ["sectors", "electrical", "automotive", "gas", "fasteners"] },
  { title: "Capabilities", path: "/capabilities", keywords: ["turning", "machining", "inspection", "manufacturing", "process"] },
  { title: "Quality", path: "/quality", keywords: ["inspection", "measuring", "print", "certification", "documentation"] },
  { title: "About", path: "/about", keywords: ["history", "1978", "company", "jamnagar", "sujata group", "story"] },
  { title: "Resources", path: "/resources", keywords: ["catalogue", "pdf", "documents", "brochure", "technical"] },
  { title: "FAQ", path: "/faq", keywords: ["questions", "help", "minimum order", "drawings", "materials", "packaging"] },
  { title: "Contact", path: "/contact", keywords: ["phone", "email", "address", "enquiry", "map"] },
  { title: "Request a quote", path: "/request-quote", keywords: ["quote", "rfq", "enquiry", "requirement"] },
  { title: "Send your drawing", path: "/request-quote?type=drawing", keywords: ["drawing", "upload", "sample", "specification"] },
];
