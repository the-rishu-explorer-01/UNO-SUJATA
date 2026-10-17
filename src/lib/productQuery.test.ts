import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProductQuery, toSearchParams, activeFilterCount } from "./productQuery";

test("parses repeated filter params and the path category", () => {
  const params = new URLSearchParams("material=brass&material=non-ferrous-alloy&page=3&search=pin");
  const q = parseProductQuery(params, "electrical");
  assert.deepEqual(q.material, ["brass", "non-ferrous-alloy"]);
  assert.equal(q.page, 3);
  assert.equal(q.search, "pin");
  assert.equal(q.category, "electrical");
});

test("invalid page numbers fall back to page 1", () => {
  for (const bad of ["0", "-2", "abc", "1.5"]) {
    const q = parseProductQuery(new URLSearchParams(`page=${bad}`));
    assert.equal(q.page, 1, `page=${bad}`);
  }
});

test("round-trips through the URL without losing filters", () => {
  const original = parseProductQuery(new URLSearchParams("search=brass+pin&process=turning&type=Pin&page=2"));
  const again = parseProductQuery(toSearchParams(original));
  assert.equal(again.search, "brass pin");
  assert.deepEqual(again.process, ["turning"]);
  assert.deepEqual(again.type, ["Pin"]);
  assert.equal(again.page, 2);
});

test("empty search and first page are omitted from the URL", () => {
  const p = toSearchParams(parseProductQuery(new URLSearchParams("search=%20%20")));
  assert.equal(p.toString(), "");
});

test("counts active filters including category", () => {
  const q = parseProductQuery(new URLSearchParams("material=brass&application=electrical&type=Pin"), "connectors");
  assert.equal(activeFilterCount(q), 4);
});
