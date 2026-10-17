/**
 * Creates the first administrator. Reads credentials from the environment so they never appear in source control.
 *   ADMIN_EMAIL=you@company.example ADMIN_PASSWORD='long passphrase' npm run admin:create
 * Clear your shell history afterwards, or set the variables in a secret manager.
 */
import { prisma } from "../utils/prisma.js";
import { hashPassword, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "../lib/passwords.js";

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  const name = (process.env.ADMIN_NAME ?? "Administrator").trim() || "Administrator";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Set ADMIN_EMAIL to a valid email address.");
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Set ADMIN_PASSWORD to between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`);
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) throw new Error("An account with this email already exists. Nothing was changed.");

  const user = await prisma.adminUser.create({
    data: { email, name, role: "ADMIN", passwordHash: await hashPassword(password) },
    select: { email: true, role: true },
  });
  console.log(`[admin] created ${user.role} account for ${user.email}`);
}

main()
  .catch((err) => {
    console.error(`[admin] ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
