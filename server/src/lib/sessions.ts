import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "uno_admin";
export const CSRF_COOKIE = "uno_csrf";
export const CSRF_HEADER = "x-csrf-token";

/** Absolute session lifetime. A reauthentication is required after this, however active the session is. */
export const SESSION_HOURS = 8;

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function newCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
