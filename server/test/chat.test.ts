import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyIntent, extractKeywords, fallbackReply, toGrounding, toCard, type ChatProductRecord } from "../src/lib/chatLogic.js";

const product: ChatProductRecord = {
  slug: "electrical-pins", name: "Electrical Pins", productCode: "EP-200", productType: "Pin",
  description: "Electrical pins made to customer drawing.", categoryName: "Pins & Terminals",
  materials: ["Brass"], applications: ["Electrical"], processes: [], image: null,
};

test("intent: greetings", () => {
  assert.equal(classifyIntent("Hello there"), "greeting");
  assert.equal(classifyIntent("good morning"), "greeting");
});

test("intent: quotations, custom parts, contact and capabilities", () => {
  assert.equal(classifyIntent("I want a quotation for 5000 pins"), "quote");
  assert.equal(classifyIntent("Can you make a custom part from my drawing?"), "custom");
  assert.equal(classifyIntent("How do I contact the sales team?"), "contact");
  assert.equal(classifyIntent("Do you have CNC turning capacity?"), "capabilities");
});

test("intent: anything else is treated as a product search", () => {
  assert.equal(classifyIntent("terminal for switch"), "product");
});

test("keywords: part numbers come first and generic words are dropped", () => {
  assert.deepEqual(extractKeywords("I need a brass terminal for a switch, part EP-200"), ["ep-200", "terminal", "switch"]);
  assert.deepEqual(extractKeywords("brass parts please"), []);
});

test("keywords: at most three, no duplicates", () => {
  const k = extractKeywords("pin pin terminal switch socket plug");
  assert.equal(k.length, 3);
  assert.equal(new Set(k).size, k.length);
});

test("grounding exposes only published fields and marks specifications as unpublished", () => {
  const g = toGrounding(product);
  assert.equal(g.partNumber, "EP-200");
  assert.equal(g.specificationsPublished, false);
  assert.equal("image" in g, false);
  assert.equal("slug" in g, false);
});

test("card DTO carries what a visitor needs and no internal fields", () => {
  const c = toCard(product);
  assert.deepEqual(Object.keys(c).sort(), ["categoryName", "description", "image", "materials", "name", "productCode", "slug"]);
});

test("fallback replies never state prices, stock or certifications", () => {
  for (const intent of ["greeting", "quote", "custom", "contact", "capabilities", "product"] as const) {
    const text = fallbackReply(intent, 2).toLowerCase();
    assert.equal(/\brs\.?\s*\d|₹|\$\s*\d|in stock|iso \d|certified|tolerance of \d/.test(text), false, intent);
  }
});

test("product fallback tells the visitor when nothing matched", () => {
  assert.match(fallbackReply("product", 0), /couldn't find/);
  assert.match(fallbackReply("product", 2), /2 published products/);
});
