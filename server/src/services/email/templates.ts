import type { OutgoingEmail } from "./types.js";

export interface RfqEmailData {
  rfqNumber: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  industry?: string;
  productNames: string[];
  quantity?: string;
  material?: string;
  finish?: string;
  application?: string;
  deliveryRequirement?: string;
  message: string;
  attachmentCount: number;
  submittedAt: Date;
}

const line = (label: string, value?: string | number) => (value === undefined || value === "" ? null : `${label}: ${value}`);
const compact = (lines: (string | null)[]) => lines.filter((l): l is string => l !== null).join("\n");

/** Confirmation sent to the customer. Contains no internal information. */
export function customerConfirmation(rfq: RfqEmailData, siteName: string): OutgoingEmail {
  return {
    to: rfq.email,
    subject: `Your requirement has been received (${rfq.rfqNumber})`,
    text: [
      `Dear ${rfq.name},`,
      "",
      "Your requirement has been received.",
      "",
      `Reference number: ${rfq.rfqNumber}`,
      "",
      "Our engineering and sales team will review the details you sent and reply to this email address. Please keep the reference number for any follow-up.",
      "",
      `${siteName}`,
    ].join("\n"),
  };
}

/** Internal notification for the sales and engineering inbox. */
export function internalNotification(rfq: RfqEmailData, to: string): OutgoingEmail {
  return {
    to,
    replyTo: rfq.email,
    subject: `New RFQ received: ${rfq.rfqNumber} from ${rfq.company.replace(/[\r\n]+/g, " ")}`,
    text: [
      "New RFQ received.",
      "",
      compact([
        line("RFQ", rfq.rfqNumber),
        line("Submitted", rfq.submittedAt.toISOString()),
        line("Name", rfq.name),
        line("Company", rfq.company),
        line("Email", rfq.email),
        line("Phone", rfq.phone),
        line("Country", rfq.country),
        line("Industry", rfq.industry),
      ]),
      "",
      compact([
        line("Products", rfq.productNames.join(", ") || undefined),
        line("Quantity", rfq.quantity),
        line("Material", rfq.material),
        line("Finish", rfq.finish),
        line("Application", rfq.application),
        line("Target delivery", rfq.deliveryRequirement),
        line("Attachments", rfq.attachmentCount),
      ]),
      "",
      "Requirement:",
      rfq.message,
    ].join("\n"),
  };
}
