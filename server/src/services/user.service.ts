import { prisma } from "../utils/prisma.js";
import { HttpError } from "../utils/http.js";
import { hashPassword, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "../lib/passwords.js";
import { audit } from "./audit.service.js";
import { normalizeEmail } from "./auth.service.js";

export async function listUsers() {
  return prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, active: true, lastLoginAt: true, createdAt: true },
  });
}

export async function createUser(actorId: string, input: { email: string; name: string; role: "ADMIN" | "EDITOR"; password: string }) {
  if (input.password.length < MIN_PASSWORD_LENGTH || input.password.length > MAX_PASSWORD_LENGTH) {
    throw new HttpError(422, `Use between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`, { password: ["Password length"] });
  }
  const email = normalizeEmail(input.email);
  const exists = await prisma.adminUser.findUnique({ where: { email } });
  if (exists) throw new HttpError(409, "A user with this email already exists.", { email: ["Already in use"] });

  const user = await prisma.adminUser.create({
    data: { email, name: input.name, role: input.role, passwordHash: await hashPassword(input.password) },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
  await audit({ actorId, action: "user.created", entityType: "AdminUser", entityId: user.id, summary: `Created ${user.role} account` });
  return user;
}

/** Changes role or active status. Guards against locking the organisation out of its last administrator. */
export async function updateUser(actorId: string, userId: string, input: { role?: "ADMIN" | "EDITOR"; active?: boolean; password?: string }) {
  const target = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!target) throw new HttpError(404, "User not found");

  const demoting = input.role === "EDITOR" && target.role === "ADMIN";
  const deactivating = input.active === false && target.active;
  if (userId === actorId && (demoting || deactivating)) {
    throw new HttpError(422, "You cannot remove your own administrator access.");
  }
  if ((demoting || deactivating) && target.role === "ADMIN") {
    const otherAdmins = await prisma.adminUser.count({ where: { role: "ADMIN", active: true, id: { not: userId } } });
    if (otherAdmins === 0) throw new HttpError(422, "At least one active administrator must remain.");
  }

  const resetting = input.password !== undefined;
  const updated = await prisma.adminUser.update({
    where: { id: userId },
    data: {
      role: input.role,
      active: input.active,
      ...(resetting ? { passwordHash: await hashPassword(input.password!), failedLoginCount: 0, lockedUntil: null } : {}),
    },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
  // Deactivation and password resets both end the target's existing sessions.
  if (deactivating || resetting) {
    await prisma.adminSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
  const summary = resetting
    ? `Password reset by administrator; sessions ended`
    : `Role ${updated.role}, ${updated.active ? "active" : "disabled"}`;
  await audit({ actorId, action: resetting ? "user.password_reset" : "user.updated", entityType: "AdminUser", entityId: userId, summary });
  return updated;
}
