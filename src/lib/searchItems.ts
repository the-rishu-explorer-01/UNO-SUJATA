import type { SearchResults } from "@/lib/api";

export type SearchGroupKey = "products" | "categories" | "industries" | "capabilities" | "resources" | "pages";

export const GROUP_LABELS: Record<SearchGroupKey, string> = {
  products: "Products",
  categories: "Categories",
  industries: "Industries",
  capabilities: "Capabilities",
  resources: "Resources",
  pages: "Pages",
};

export interface SearchItem {
  group: SearchGroupKey;
  label: string;
  meta?: string;
  to: string;
}

/** Order matches the agreed grouping: products first, pages last. Empty groups are dropped. */
export function flattenResults(r: SearchResults): { group: SearchGroupKey; items: SearchItem[] }[] {
  const groups: { group: SearchGroupKey; items: SearchItem[] }[] = [
    { group: "products", items: r.products.map((p) => ({ group: "products", label: p.name, meta: [p.categoryName, p.productCode].filter(Boolean).join(" · "), to: `/products/${p.slug}` })) },
    { group: "categories", items: r.categories.map((c) => ({ group: "categories", label: c.name, meta: c.summary, to: `/products/category/${c.slug}` })) },
    { group: "industries", items: r.industries.map((i) => ({ group: "industries", label: i.name, meta: i.summary, to: `/industries/${i.slug}` })) },
    { group: "capabilities", items: r.capabilities.map((c) => ({ group: "capabilities", label: c.title, meta: c.description, to: "/capabilities" })) },
    { group: "resources", items: r.resources.map((x) => ({ group: "resources", label: x.title, meta: x.description, to: "/resources" })) },
    { group: "pages", items: r.pages.map((p) => ({ group: "pages", label: p.title, to: p.path })) },
  ];
  return groups.filter((g) => g.items.length > 0);
}

export function totalResults(r: SearchResults): number {
  return flattenResults(r).reduce((n, g) => n + g.items.length, 0);
}
