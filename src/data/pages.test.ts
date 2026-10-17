import { test } from "node:test";
import assert from "node:assert/strict";
import { industryContent, capabilitySections, timeline, qualityStages } from "./pages";
import { applications as seedApplications, products as seedProducts } from "./products";
import { industries as seedIndustries } from "./content";

test("every industry page has content for each required section", () => {
  for (const i of industryContent) {
    assert.ok(i.requirement.length > 40, `${i.slug} requirement`);
    assert.ok(i.components.length >= 1, `${i.slug} components`);
    assert.ok(i.capability.length > 20, `${i.slug} capability`);
    assert.ok(i.applicationSlugs.length >= 1, `${i.slug} applications`);
  }
});

test("industry content matches the catalogue seed list exactly", () => {
  const seedSlugs = seedIndustries.map((i) => i.slug).sort();
  const contentSlugs = industryContent.map((i) => i.slug).sort();
  assert.deepEqual(contentSlugs, seedSlugs);
});

test("industry application links point at real catalogue applications", () => {
  const valid = new Set(seedApplications.map((a) => a.slug));
  for (const i of industryContent) {
    for (const a of i.applicationSlugs) assert.ok(valid.has(a), `${i.slug} -> ${a}`);
  }
});

test("every industry has at least one catalogue product", () => {
  for (const i of industryContent) {
    const count = seedProducts.filter((p) => p.applications.some((a) => i.applicationSlugs.includes(a))).length;
    assert.ok(count > 0, i.slug);
  }
});

test("capability sections are non-empty and each step has a basis", () => {
  for (const s of capabilitySections) {
    assert.ok(s.steps.length > 0);
    for (const step of s.steps) assert.ok(step.basis === "fact" || step.basis === "CONFIRM");
  }
});

test("timeline starts at the verified founding year and contains no other dated events", () => {
  assert.equal(timeline[0].label, "1978");
  const dated = timeline.filter((t) => /^\d{4}$/.test(t.label));
  assert.equal(dated.length, 1);
});

test("quality stages declare their basis so unverified claims are visible", () => {
  for (const q of qualityStages) assert.ok(["fact", "CONFIRM"].includes(q.basis), q.title);
});
