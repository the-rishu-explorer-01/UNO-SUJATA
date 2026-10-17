/** GSTIN format check only (state code, PAN-like body, entity, 'Z', checksum). Does not verify registration. */
export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export function isValidGstin(v: string): boolean {
  return GSTIN_PATTERN.test(v);
}
