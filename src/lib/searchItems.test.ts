import { test } from "node:test";
import assert from "node:assert/strict";
import { flattenResults, totalResults } from "./searchItems";
import { isSensitiveQuery, rememberSearch, getRecentSearches } from "./searchRecent";

const empty = { query: "x", products: [], categories: [], industries: [], capabilities: [], resources: [], pages: [] };

test("groups appear in the agreed order and empty groups are dropped", () => {
  const groups = flattenResults({
    ...empty,
    pages: [{ title: "Capabilities", path: "/capabilities" }],
    products: [{ slug: "brass-pin", name: "Brass Pin", categoryName: "Electrical", productCode: null }],
  });
  assert.deepEqual(groups.map((g) => g.group), ["products", "pages"]);
  assert.equal(groups[0].items[0].to, "/products/brass-pin");
});

test("totals count every item across groups", () => {
  assert.equal(totalResults({ ...empty, categories: [{ slug: "a", name: "A", summary: "" }, { slug: "b", name: "B", summary: "" }] }), 2);
  assert.equal(totalResults(empty), 0);
});

test("sensitive-looking queries are never flagged as safe to remember", () => {
  assert.equal(isSensitiveQuery("buyer@acme.example"), true);
  assert.equal(isSensitiveQuery("call 98765 43210"), true);
  assert.equal(isSensitiveQuery("my bank account number"), true);
  assert.equal(isSensitiveQuery("x".repeat(80)), true);
  assert.equal(isSensitiveQuery("brass terminal"), false);
  assert.equal(isSensitiveQuery("fuel jets"), false);
});

test("the recent list stores ordinary terms only and holds five at most", () => {
  const store = new Map<string, string>();
  (globalThis as unknown as { sessionStorage: unknown }).sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  rememberSearch("buyer@acme.example");
  assert.deepEqual(getRecentSearches(), []);
  for (const t of ["pin", "terminal", "gas", "nut", "washer", "bush"]) rememberSearch(t);
  assert.equal(getRecentSearches().length, 5);
  assert.equal(getRecentSearches()[0], "bush");
  rememberSearch("PIN");
  assert.equal(getRecentSearches().filter((x) => x.toLowerCase() === "pin").length, 1, "no duplicates");
});
