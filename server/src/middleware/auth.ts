import type { NextFunction, Request, Response } from "express";
import { prisma } from "../utils/prisma.js";
import { HttpError } from "../utils/http.js";
import { can, type Permission } from "../lib/permissions.js";
import { CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE, hashSessionToken } from "../lib/sessions.js";
import { timingSafeEqual } from "node:crypto";
import { readCookie } from "../lib/cookies.js";

export { readCookie } from "../lib/cookies.js";

/**
 * Authenticates the session cookie against the database on every request.
 * Revocation, expiry and deactivation take effect immediately, because nothing is trusted from the token alone.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = readCookie(req, SESSION_COOKIE);
    if (!token || token.length < 20 || token.length > 200) throw new HttpError(401, "Please sign in to continue.");

    const session = await prisma.adminSession.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { select: { id: true, email: true, name: true, role: true, active: true } } },
    });
    const now = new Date();
    if (!session || session.revokedAt || session.expiresAt <= now || !session.user.active) {
      throw new HttpError(401, "Your session has ended. Please sign in again.");
    }

    req.admin = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      sessionId: session.id,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Double-submit CSRF protection for state-changing requests. The cookie is readable by our own
 * script, and a cross-site page cannot read it or set the matching header.
 */
export function requireCsrf(req: Request, _res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const cookie = readCookie(req, CSRF_COOKIE);
  const header = req.header(CSRF_HEADER);
  if (!cookie || !header || cookie.length !== header.length) {
    return next(new HttpError(403, "Your session needs refreshing. Reload the page and try again.", undefined, "CSRF"));
  }
  const ok = timingSafeEqual(Buffer.from(cookie), Buffer.from(header));
  if (!ok) return next(new HttpError(403, "Your session needs refreshing. Reload the page and try again.", undefined, "CSRF"));
  next();
}

/** Route-level permission check. Runs after requireAuth. */
export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.admin) return next(new HttpError(401, "Please sign in to continue."));
    if (!can(req.admin.role, permission)) return next(new HttpError(403, "You do not have permission to do that."));
    next();
  };
}
