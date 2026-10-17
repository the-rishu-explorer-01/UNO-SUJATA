import { prisma } from "../utils/prisma.js";
import { HttpError } from "../utils/http.js";
import { DUMMY_HASH, hashPassword, verifyPassword, MIN_PASSWORD_LENGTH } from "../lib/passwords.js";
import { SESSION_HOURS, hashSessionToken, newSessionToken } from "../lib/sessions.js";
import { audit } from "./audit.service.js";

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

/** Same message for every login failure, so the response never reveals whether an account exists or is locked. */
const INVALID = () => new HttpError(401, "Email or password is incorrect.", undefined, "INVALID_CREDENTIALS");

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function login(input: { email: string; password: string; ip?: string; userAgent?: string }) {
  const email = normalizeEmail(input.email);
  const user = await prisma.adminUser.findUnique({ where: { email } });
  const now = new Date();

  // Unknown or disabled accounts still run a full hash, so response time does not reveal which emails exist.
  if (!user || !user.active) {
    await verifyPassword(input.password, DUMMY_HASH);
    throw INVALID();
  }

  if (user.lockedUntil && user.lockedUntil > now) {
    await verifyPassword(input.password, DUMMY_HASH);
    throw INVALID();
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) {
    const failures = user.failedLoginCount + 1;
    const lock = failures >= MAX_FAILURES ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : null;
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { failedLoginCount: lock ? 0 : failures, lockedUntil: lock },
    });
    await audit({ actorId: user.id, action: "auth.login_failed", entityType: "AdminUser", entityId: user.id, summary: lock ? "Account locked after repeated failures" : "Wrong password" });
    throw INVALID();
  }

  const token = newSessionToken();
  const expiresAt = new Date(now.getTime() + SESSION_HOURS * 3600_000);
  await prisma.$transaction([
    prisma.adminSession.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt,
        userAgent: input.userAgent?.slice(0, 255) ?? null,
        ipAddress: input.ip?.slice(0, 64) ?? null,
      },
    }),
    prisma.adminUser.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
    }),
  ]);
  await audit({ actorId: user.id, action: "auth.login", entityType: "AdminUser", entityId: user.id, summary: "Signed in" });

  return {
    token,
    expiresAt,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export async function logout(sessionId: string, actorId: string) {
  await prisma.adminSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  await audit({ actorId, action: "auth.logout", entityType: "AdminUser", entityId: actorId, summary: "Signed out" });
}

export async function changePassword(userId: string, current: string, next: string) {
  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!user) throw INVALID();
  const ok = await verifyPassword(current, user.passwordHash);
  if (!ok) throw new HttpError(422, "Your current password is incorrect.", { currentPassword: ["Incorrect password"] });
  if (next.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(422, `Use at least ${MIN_PASSWORD_LENGTH} characters.`, { newPassword: [`Use at least ${MIN_PASSWORD_LENGTH} characters`] });
  }
  if (next === current) throw new HttpError(422, "Choose a different password.", { newPassword: ["Choose a different password"] });

  const passwordHash = await hashPassword(next);
  // Changing the password signs out every session, including this one.
  await prisma.$transaction([
    prisma.adminUser.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.adminSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  await audit({ actorId: userId, action: "auth.password_changed", entityType: "AdminUser", entityId: userId, summary: "Password changed; all sessions signed out" });
}

/** Removes expired and revoked sessions. Run on the hourly maintenance timer. */
export async function purgeSessions(): Promise<number> {
  const res = await prisma.adminSession.deleteMany({
    where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { not: null } }] },
  });
  return res.count;
}
