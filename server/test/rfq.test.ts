import { test } from "node:test";
import assert from "node:assert/strict";
import { rfqSubmissionSchema } from "../src/lib/rfqSchema.js";
import { formatRfqNumber, isRfqNumber, generateAccessToken, hashToken, tokenMatches } from "../src/lib/rfqNumber.js";
import { sanitizeText, sanitizeLine } from "../src/lib/text.js";

const valid = {
  name: "Asha Patel",
  company: "Acme Electricals",
  email: "buyer@acme.example",
  phone: "+91 98765 43210",
  country: "India",
  productSlugs: ["terminals"],
  message: "We need 5,000 brass terminals per month for a switchgear range.",
  consent: true,
};

test("accepts a valid submission and lowercases the email", () => {
  const r = rfqSubmissionSchema.safeParse({ ...valid, email: "Buyer@Acme.Example" });
  assert.equal(r.success, true);
  if (r.success) assert.equal(r.data.email, "buyer@acme.example");
});

test("rejects an invalid email", () => {
  const r = rfqSubmissionSchema.safeParse({ ...valid, email: "not-an-email" });
  assert.equal(r.success, false);
});

test("requires consent to be exactly true", () => {
  assert.equal(rfqSubmissionSchema.safeParse({ ...valid, consent: false }).success, false);
  assert.equal(rfqSubmissionSchema.safeParse({ ...valid, consent: undefined }).success, false);
});

test("rejects missing required fields", () => {
  const { name: _n, ...rest } = valid;
  assert.equal(rfqSubmissionSchema.safeParse(rest).success, false);
});

test("requires a requirement description of at least 20 characters", () => {
  assert.equal(rfqSubmissionSchema.safeParse({ ...valid, message: "too short" }).success, false);
});

test("rejects an invalid phone number", () => {
  assert.equal(rfqSubmissionSchema.safeParse({ ...valid, phone: "call me maybe" }).success, false);
});

test("filled honeypot is rejected", () => {
  assert.equal(rfqSubmissionSchema.safeParse({ ...valid, website: "http://spam.example" }).success, false);
  assert.equal(rfqSubmissionSchema.safeParse({ ...valid, website: "" }).success, true);
});

test("rejects more than 5 products or attachments", () => {
  assert.equal(rfqSubmissionSchema.safeParse({ ...valid, productSlugs: Array(6).fill("terminals") }).success, false);
  const ids = Array.from({ length: 6 }, () => "11111111-1111-4111-8111-111111111111");
  assert.equal(rfqSubmissionSchema.safeParse({ ...valid, attachmentIds: ids }).success, false);
});

test("rejects product slugs with unsafe characters", () => {
  assert.equal(rfqSubmissionSchema.safeParse({ ...valid, productSlugs: ["../admin"] }).success, false);
});

test("strips HTML from free text and removes line breaks from single-line fields", () => {
  const r = rfqSubmissionSchema.safeParse({
    ...valid,
    company: "Acme<script>alert(1)</script>\nBcc: evil@example.com",
    message: "<b>Bold</b> requirement text that is long enough to pass.",
  });
  assert.equal(r.success, true);
  if (r.success) {
    assert.equal(r.data.company.includes("<"), false);
    assert.equal(r.data.company.includes("\n"), false);
    assert.equal(r.data.message.includes("<b>"), false);
  }
});

test("sanitiseText keeps line breaks in long text but drops control characters", () => {
  assert.equal(sanitizeText("line one\n\nline two\u0007", 100), "line one\n\nline two");
  assert.equal(sanitizeLine("a\r\nb", 100), "a b");
});

test("RFQ numbers have the agreed format and are validated", () => {
  assert.equal(formatRfqNumber(2026, 1), "RFQ-SUJ-2026-00001");
  assert.equal(formatRfqNumber(2026, 123), "RFQ-SUJ-2026-00123");
  assert.equal(isRfqNumber("RFQ-SUJ-2026-00001"), true);
  assert.equal(isRfqNumber("RFQ-SUJ-26-1"), false);
  assert.equal(isRfqNumber("RFQ-SUJ-2026-00001; DROP"), false);
});

test("access tokens are random, hashed at rest and checked in constant time", () => {
  const t1 = generateAccessToken();
  const t2 = generateAccessToken();
  assert.notEqual(t1, t2);
  assert.ok(t1.length >= 30);
  const stored = hashToken(t1);
  assert.notEqual(stored, t1);
  assert.equal(tokenMatches(t1, stored), true);
  assert.equal(tokenMatches(t2, stored), false);
  assert.equal(tokenMatches("", stored), false);
});
