/**
 * Recent searches for this browser tab only.
 *
 * Stored in sessionStorage, which is cleared when the tab closes. Never sent to the server.
 * Queries that look personal or sensitive are never stored: emails, phone-like numbers,
 * long text, and words that suggest account, identity or payment details.
 */
const KEY = "uno.recentSearches";
const MAX = 5;

const SENSITIVE_WORDS = /(password|passport|aadhaar|aadhar|pan\s*card|bank|account\s*(no|number)|card\s*number|cvv|otp|salary|medical|diagnos)/i;

export function isSensitiveQuery(q: string): boolean {
  const t = q.trim();
  if (t.length > 60) return true;
  if (t.includes("@")) return true;
  if ((t.match(/\d/g) ?? []).length >= 6) return true;
  if (SENSITIVE_WORDS.test(t)) return true;
  return false;
}

export function getRecentSearches(): string[] {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function rememberSearch(q: string): void {
  const term = q.trim();
  if (term.length < 2 || isSensitiveQuery(term)) return;
  const next = [term, ...getRecentSearches().filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, MAX);
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode): simply do not remember */
  }
}

export function clearRecentSearches(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
