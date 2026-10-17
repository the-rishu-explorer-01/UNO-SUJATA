/**
 * Sanitises free text from customers. Removes control characters and any HTML tags,
 * collapses whitespace, and enforces a maximum length. Output is plain text only.
 */
export function sanitizeText(input: string, maxLength: number): string {
  return input
    .normalize("NFC")
    .replace(/<[^>]*>/g, " ")          // strip tags
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") // control chars (keep \t \n \r)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

/** Single-line fields (names, companies, references): also removes line breaks, so they cannot inject into email headers. */
export function sanitizeLine(input: string, maxLength: number): string {
  return sanitizeText(input, maxLength).replace(/\s*[\r\n]+\s*/g, " ").trim();
}
