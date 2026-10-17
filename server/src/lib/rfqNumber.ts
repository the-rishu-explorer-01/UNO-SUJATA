import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const RFQ_NUMBER_PATTERN = /^RFQ-SUJ-(\d{4})-(\d{5,})$/;

/** RFQ-SUJ-2026-00001. The sequence number comes from the database, never from the client. */
export function formatRfqNumber(year: number, sequence: number): string {
  return `RFQ-SUJ-${year}-${String(sequence).padStart(5, "0")}`;
}

export function isRfqNumber(value: string): boolean {
  return RFQ_NUMBER_PATTERN.test(value);
}

/** 192-bit random token returned once to the customer. Only its hash is stored. */
export function generateAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time comparison of a presented token against the stored hash. */
export function tokenMatches(presented: string, storedHash: string): boolean {
  const a = Buffer.from(hashToken(presented), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
