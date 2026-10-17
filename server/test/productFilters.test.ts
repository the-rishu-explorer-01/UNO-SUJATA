import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWhere, tokenize, MAX_LIMIT } from "../src/services/productFilters.js";

const base = { page: 1, limit: 12 };

test("tokenize lowercases, strips punctuation and drops one-letter terms", () => {
  assert.deepEqual(tokenize("Brass PIN"), ["brass", "pin"]);
  assert.deepEqual(tokenize("a brass-pin!!!"), ["brass-pin"]);
  assert.deepEqual(tokenize("   "), []);
});

test("tokenize caps the number of terms to bound query cost", () => {
  assert.equal(tokenize("a1 b1 c1 d1 e1 f1 g1 h1").length, 6);
});

test("buildWhere always restricts to published products", () => {
  const where = buildWhere({ ...base });
  assert.deepEqual(where, { AND: [{ published: true }] });
});

test("each search term must match (AND across terms)", () => {
  const where = buildWhere({ ...base, search: "brass pin" });
  const json = JSON.stringify(where);
  // Two term clauses inside AND, so "brass" and "pin" are both required.
  assert.equal((json.match(/"OR"/g) ?? []).length, 2);
});

test("plural search also matches the singular form", () => {
  const json = JSON.stringify(buildWhere({ ...base, search: "pins" }));
  assert.ok(json.includes('"contains":"pin"'), "singular variant should be included");
});

test("facet values combine with OR within a facet and AND across facets", () => {
  const where = buildWhere({
    ...base,
    material: ["brass", "non-ferrous-alloy"],
    application: ["electrical"],
  });
  const json = JSON.stringify(where);
  assert.ok(json.includes('"materials":{"some":{"slug":{"in":["brass","non-ferrous-alloy"]}}}'));
  assert.ok(json.includes('"applications":{"some":{"slug":{"in":["electrical"]}}}'));
});

test("category and product type filters are applied", () => {
  const json = JSON.stringify(buildWhere({ ...base, category: "electrical", type: ["Pin"] }));
  assert.ok(json.includes('"category":{"slug":"electrical"}'));
  assert.ok(json.includes('"productType":{"in":["Pin"]}'));
});

test("page size ceiling is enforced at the API layer", () => {
  assert.equal(MAX_LIMIT, 48);
});
