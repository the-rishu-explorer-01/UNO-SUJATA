export const MAX_QUERY = 100;

/**
 * Cleans a search string: removes control characters, collapses spaces, caps length.
 * Search text is never written to logs or to the database.
 */
export function normalizeQuery(raw: string | undefined): string {
  return (raw ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY);
}
