export const RFQ_STATUSES = ["NEW", "UNDER_REVIEW", "TECHNICAL_REVIEW", "QUOTE_PREPARED", "CLOSED"] as const;
export type RfqStatusValue = (typeof RFQ_STATUSES)[number];

export const STATUS_TEXT: Record<RfqStatusValue, string> = {
  NEW: "New",
  UNDER_REVIEW: "Under review",
  TECHNICAL_REVIEW: "Technical review",
  QUOTE_PREPARED: "Quote prepared",
  CLOSED: "Closed",
};
