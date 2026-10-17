import type { CompanyFact } from "@/types/catalog";

/**
 * Every value here is taken from the existing Sujata website
 * (sujatabrass.com/brassdivision) unless marked TODO.
 * Confirm with the client before launch.
 */
export const company = {
  brand: "UNO SUJATA",
  legalName: "Sujata Brass Components Pvt. Ltd.", // site footer / header
  founded: 1978,
  location: "Jamnagar, Gujarat, India",
  address:
    "Plot no. 50, B/H Essar Petrol Pump, Industrial Area, Jamnagar - Rajkot Hwy, Hapa, Gujarat 361120",
  phone: "+91 288 2570995 / 2570096",
  email: "info@sujatabrass.com",
  // Company's own self-description, shown with attribution in the UI.
  exporterClaim:
    "The company describes itself as India's third largest exporter of brass and copper parts.",
};

export const trustFacts: CompanyFact[] = [
  { value: "1978", label: "Manufacturing since" },
  { value: "100,000", label: "Sq. ft. facility area" },
  { value: "120", label: "Workforce" },
  { value: "Custom", label: "Built to your drawing" },
];

export const heroMeta = `Manufacturing since ${company.founded} · ${company.location}`;
