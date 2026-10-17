import type { NextFunction, Request, Response } from "express";
import { loginBody, passwordChangeBody } from "../lib/adminSchemas.js";
import { CSRF_COOKIE, SESSION_COOKIE, SESSION_HOURS, newCsrfToken } from "../lib/sessions.js";
import { HttpError } from "../utils/http.js";
import * as auth from "../services/auth.service.js";

const secure = () => process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";

/** Session cookie is HttpOnly, so scripts cannot read it. The CSRF cookie is readable only so the app can echo it in a header. */
function setSessionCookies(res: Response, token: string, csrf: string) {
  const maxAge = SESSION_HOURS * 3600_000;
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, secure: secure(), sameSite: "strict", path: "/", maxAge });
  res.cookie(CSRF_COOKIE, csrf, { httpOnly: false, secure: secure(), sameSite: "strict", path: "/", maxAge });
}

function clearSessionCookies(res: Response) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: secure(), sameSite: "strict", path: "/" });
  res.clearCookie(CSRF_COOKIE, { httpOnly: false, secure: secure(), sameSite: "strict", path: "/" });
}

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

export const authController = {
  login: wrap(async (req, res) => {
    const parsed = loginBody.safeParse(req.body ?? {});
    if (!parsed.success) throw new HttpError(422, "Please check the highlighted fields.", parsed.error.flatten().fieldErrors);
    const result = await auth.login({
      email: parsed.data.email,
      password: parsed.data.password,
      ip: req.ip,
      userAgent: req.header("user-agent") ?? undefined,
    });
    setSessionCookies(res, result.token, newCsrfToken());
    res.json({ user: result.user, expiresAt: result.expiresAt });
  }),

  logout: wrap(async (req, res) => {
    if (req.admin) await auth.logout(req.admin.sessionId, req.admin.id);
    clearSessionCookies(res);
    res.status(204).end();
  }),

  me: wrap(async (req, res) => {
    if (!req.admin) throw new HttpError(401, "Please sign in to continue.");
    res.json({ user: { id: req.admin.id, email: req.admin.email, name: req.admin.name, role: req.admin.role } });
  }),

  /** Issues a fresh CSRF token for an already-authenticated session (for example after a reload). */
  refreshCsrf: wrap(async (req, res) => {
    if (!req.admin) throw new HttpError(401, "Please sign in to continue.");
    const csrf = newCsrfToken();
    res.cookie(CSRF_COOKIE, csrf, { httpOnly: false, secure: secure(), sameSite: "strict", path: "/", maxAge: SESSION_HOURS * 3600_000 });
    res.json({ ok: true });
  }),

  changePassword: wrap(async (req, res) => {
    if (!req.admin) throw new HttpError(401, "Please sign in to continue.");
    const parsed = passwordChangeBody.safeParse(req.body ?? {});
    if (!parsed.success) throw new HttpError(422, "Please check the highlighted fields.", parsed.error.flatten().fieldErrors);
    await auth.changePassword(req.admin.id, parsed.data.currentPassword, parsed.data.newPassword);
    clearSessionCookies(res);
    res.json({ ok: true, message: "Password changed. Please sign in again." });
  }),
};

