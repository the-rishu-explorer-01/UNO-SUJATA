import { test } from "node:test";
import assert from "node:assert/strict";
import { rfqFormSchema } from "./schemas";

const base = {
  name: "Asha Patel",
  company: "Acme Electricals",
  email: "buyer@acme.example",
  phone: "+91 98765 43210",
  country: "India",
  industry: "",
  product: "",
  partNumber: "",
  quantity: "",
  material: "",
  finish: "",
  application: "",
  deliveryRequirement: "",
  message: "We need 5,000 brass terminals per month for a switchgear range.",
  consent: true as const,
};

test("accepts a complete valid form", () => {
  assert.equal(rfqFormSchema.safeParse(base).success, true);
});

test("reports invalid email", () => {
  const r = rfqFormSchema.safeParse({ ...base, email: "buyer@" });
  assert.equal(r.success, false);
  if (!r.success) assert.ok(r.error.flatten().fieldErrors.email);
});

test("reports missing required fields by name", () => {
  const r = rfqFormSchema.safeParse({ ...base, name: "", company: "", country: "" });
  assert.equal(r.success, false);
  if (!r.success) {
    const f = r.error.flatten().fieldErrors;
    assert.ok(f.name && f.company && f.country);
  }
});

test("message needs at least 20 characters", () => {
  assert.equal(rfqFormSchema.safeParse({ ...base, message: "short" }).success, false);
});

test("consent is required", () => {
  assert.equal(rfqFormSchema.safeParse({ ...base, consent: false as unknown as true }).success, false);
});

test("honeypot must stay empty", () => {
  assert.equal(rfqFormSchema.safeParse({ ...base, website: "spam" }).success, false);
});

test("phone must look like a phone number", () => {
  assert.equal(rfqFormSchema.safeParse({ ...base, phone: "abc" }).success, false);
});
