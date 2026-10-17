import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeQuery, MAX_QUERY } from "../src/lib/searchQuery.js";
import { PAGE_INDEX } from "../src/services/site-index.js";
import { isPdf } from "../src/services/media.service.js";
import { faqEntries } from "../../src/data/faq.js";
import { RESOURCE_TYPES, FAQ_CATEGORIES } from "../src/lib/faqCategories.js";

test("search query is trimmed, collapsed and stripped of control characters", () => {
  assert.equal(normalizeQuery("  brass   pin \u0007 "), "brass pin");
  assert.equal(normalizeQuery(undefined), "");
  assert.equal(normalizeQuery("a\nb\tc"), "a b c");
});

test("search query length is capped", () => {
  assert.equal(normalizeQuery("x".repeat(500)).length, MAX_QUERY);
});

test("the page index includes every public page the navigation links to", () => {
  const paths = PAGE_INDEX.map((p) => p.path);
  for (const required of ["/", "/products", "/industries", "/capabilities", "/quality", "/about", "/resources", "/faq", "/contact", "/request-quote"]) {
    assert.ok(paths.includes(required), required);
  }
});

test("PDF validation needs both the header and the end-of-file marker", () => {
  assert.equal(isPdf(Buffer.from("%PDF-1.7\n...\n%%EOF\n")), true);
  assert.equal(isPdf(Buffer.from("%PDF-1.7\nno end marker")), false, "truncated files are refused");
  assert.equal(isPdf(Buffer.from("<html>not a pdf</html>%%EOF")), false);
  assert.equal(isPdf(Buffer.from([0x4d, 0x5a])), false);
});

test("FAQ category values match the resource and FAQ category lists", () => {
  const valid = new Set(FAQ_CATEGORIES.map((c) => c.value));
  for (const f of faqEntries) assert.ok(valid.has(f.category), f.question);
});

test("every FAQ answer is non-empty and states no unconfirmed promises", () => {
  for (const f of faqEntries) {
    assert.ok(f.answer.length > 20, f.question);
    assert.equal(/within \d+ (hours|days)|guarantee|certified to|iso \d/i.test(f.answer), false, `unconfirmed claim in: ${f.question}`);
  }
});

test("resource types are the five agreed document kinds", () => {
  assert.deepEqual(RESOURCE_TYPES.map((t) => t.value), ["CATALOGUE", "TECHNICAL", "BROCHURE", "QUALITY", "APPLICATION"]);
});
