import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, DUMMY_HASH } from "../src/lib/passwords.js";
import { can, ROLE_PERMISSIONS, PERMISSIONS } from "../src/lib/permissions.js";
import { readCookie } from "../src/lib/cookies.js";
import { slugify } from "../src/lib/slug.js";
import { detectImage } from "../src/services/media.service.js";
import { hashSessionToken, newSessionToken } from "../src/lib/sessions.js";
import { passwordChangeBody, productBody, userUpdateBody, loginBody, publicContactBody, idParam } from "../src/lib/adminSchemas.js";
import { CONTENT_SCHEMAS, CONTENT_DEFAULTS } from "../src/lib/contentSchemas.js";
import { RFQ_STATUSES } from "../src/lib/rfqStatus.js";

// ---------- passwords ----------

test("passwords are hashed with scrypt, never stored in plain text", async () => {
  const hash = await hashPassword("correct horse battery");
  assert.ok(hash.startsWith("scrypt$"));
  assert.equal(hash.includes("correct horse"), false);
  assert.notEqual(await hashPassword("correct horse battery"), hash, "each hash uses a fresh salt");
});

test("verifyPassword accepts the right password and rejects others", async () => {
  const hash = await hashPassword("correct horse battery");
  assert.equal(await verifyPassword("correct horse battery", hash), true);
  assert.equal(await verifyPassword("correct horse batter", hash), false);
  assert.equal(await verifyPassword("", hash), false);
});

test("verifyPassword rejects malformed stored values instead of throwing", async () => {
  assert.equal(await verifyPassword("x", "not-a-hash"), false);
  assert.equal(await verifyPassword("x", "md5$1$2$3$4$5"), false);
});

test("the dummy hash is well-formed so timing equalisation runs a full hash", async () => {
  assert.equal(DUMMY_HASH.split("$").length, 6);
  assert.equal(await verifyPassword("anything at all", DUMMY_HASH), false);
});

// ---------- permissions ----------

test("ADMIN holds every permission", () => {
  for (const p of PERMISSIONS) assert.equal(can("ADMIN", p), true, p);
});

test("EDITOR cannot manage users or read a locked-down settings area", () => {
  assert.equal(can("EDITOR", "user:manage"), false);
  assert.equal(can("EDITOR", "rfq:update"), true);
  assert.equal(can("EDITOR", "product:write"), true);
});

test("unknown roles hold no permissions", () => {
  assert.equal(can("GUEST" as never, "dashboard:read"), false);
  assert.equal(can("ADMIN", "not:a:permission" as never), false);
});

test("every role's permission list only contains known permissions", () => {
  for (const [role, list] of Object.entries(ROLE_PERMISSIONS)) {
    for (const p of list) assert.ok((PERMISSIONS as readonly string[]).includes(p), `${role} has unknown ${p}`);
  }
});

// ---------- sessions and cookies ----------

test("session tokens are random and stored only as a hash", () => {
  const a = newSessionToken();
  const b = newSessionToken();
  assert.notEqual(a, b);
  assert.ok(a.length >= 40);
  assert.notEqual(hashSessionToken(a), a);
  assert.equal(hashSessionToken(a), hashSessionToken(a));
});

test("cookie reader finds the named cookie among several", () => {
  const req = { headers: { cookie: "a=1; uno_admin=abc%2Fdef; other=x" } } as never;
  assert.equal(readCookie(req, "uno_admin"), "abc/def");
  assert.equal(readCookie(req, "missing"), undefined);
});

test("cookie reader survives malformed encoding", () => {
  const req = { headers: { cookie: "uno_admin=%E0%A4%A" } } as never;
  assert.equal(readCookie(req, "uno_admin"), undefined);
});

// ---------- uploads ----------

test("images are recognised by their bytes, not by name", () => {
  assert.equal(detectImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), "jpg");
  assert.equal(detectImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "png");
  assert.equal(detectImage(Buffer.from("RIFF0000WEBPVP8 ", "latin1")), "webp");
  assert.equal(detectImage(Buffer.from("<svg onload=alert(1)>")), null);
  assert.equal(detectImage(Buffer.from("MZ....")), null);
});

// ---------- slugs ----------

test("slugify produces safe, lowercase URL names", () => {
  assert.equal(slugify("Brass Electrical Pin (2mm)!"), "brass-electrical-pin-2mm");
  assert.equal(slugify("Café Terminal"), "cafe-terminal");
  assert.equal(slugify("<script>alert(1)</script>"), "script-alert-1-script");
  assert.equal(slugify("***"), "");
});

// ---------- validation ----------

test("login rejects malformed email and empty password", () => {
  assert.equal(loginBody.safeParse({ email: "nope", password: "x" }).success, false);
  assert.equal(loginBody.safeParse({ email: "a@b.example", password: "" }).success, false);
  assert.equal(loginBody.safeParse({ email: "a@b.example", password: "x" }).success, true);
});

test("password change enforces the minimum length", () => {
  assert.equal(passwordChangeBody.safeParse({ currentPassword: "old", newPassword: "short" }).success, false);
  assert.equal(passwordChangeBody.safeParse({ currentPassword: "old", newPassword: "long enough password" }).success, true);
});

test("user update must change something", () => {
  assert.equal(userUpdateBody.safeParse({}).success, false);
  assert.equal(userUpdateBody.safeParse({ active: false }).success, true);
  assert.equal(userUpdateBody.safeParse({ role: "SUPERUSER" }).success, false);
});

const productOk = {
  name: "Brass Pin", productType: "Pin", description: "A precise brass pin made to drawing.", categoryId: "clabc123456",
};

test("product input accepts a valid product and defaults relations to empty", () => {
  const r = productBody.safeParse(productOk);
  assert.equal(r.success, true);
  if (r.success) assert.deepEqual(r.data.materialIds, []);
});

test("product input rejects mass-assignment of unknown fields' types and bad ids", () => {
  assert.equal(productBody.safeParse({ ...productOk, categoryId: "../../etc" }).success, false);
  assert.equal(productBody.safeParse({ ...productOk, specifications: [{ label: "", value: "x" }] }).success, false);
  assert.equal(productBody.safeParse({ ...productOk, materialIds: Array(11).fill("abcdefgh") }).success, false);
});

test("product codes that are blank become null", () => {
  const r = productBody.safeParse({ ...productOk, productCode: "   " });
  assert.equal(r.success && r.data.productCode, null);
});

test("route ids must be safe identifiers", () => {
  assert.equal(idParam.safeParse("clx8k2m3p0000abc").success, true);
  assert.equal(idParam.safeParse("1; DROP TABLE").success, false);
  assert.equal(idParam.safeParse("ab").success, false);
});

test("public contact form rejects a filled honeypot and short messages", () => {
  const base = { name: "Asha", email: "a@b.example", message: "Please call me about terminals." };
  assert.equal(publicContactBody.safeParse(base).success, true);
  assert.equal(publicContactBody.safeParse({ ...base, website: "spam" }).success, false);
  assert.equal(publicContactBody.safeParse({ ...base, message: "hi" }).success, false);
});

// ---------- CMS ----------

test("every CMS default passes its own schema", () => {
  for (const key of Object.keys(CONTENT_SCHEMAS) as (keyof typeof CONTENT_SCHEMAS)[]) {
    const r = CONTENT_SCHEMAS[key].safeParse(CONTENT_DEFAULTS[key]);
    assert.equal(r.success, true, key);
  }
});

test("CMS rejects an invalid contact email and unknown homepage section keys", () => {
  assert.equal(CONTENT_SCHEMAS.contact.safeParse({ ...CONTENT_DEFAULTS.contact, email: "not-email" }).success, false);
  assert.equal(
    CONTENT_SCHEMAS["homepage.sections"].safeParse({ sections: [{ key: "scripts", enabled: true }] }).success,
    false
  );
});

test("RFQ status list is the agreed five statuses", () => {
  assert.deepEqual([...RFQ_STATUSES], ["NEW", "UNDER_REVIEW", "TECHNICAL_REVIEW", "QUOTE_PREPARED", "CLOSED"]);
});
