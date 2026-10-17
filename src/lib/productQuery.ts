import type { ProductQuery } from "@/types/catalog";

export const PAGE_SIZE = 12;

/** Reads catalogue state from the URL. The URL is the single source of truth for search and filters. */
export function parseProductQuery(params: URLSearchParams, categoryFromPath?: string): ProductQuery {
  const num = (v: string | null, fallback: number) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 ? n : fallback;
  };
  return {
    search: params.get("search") ?? "",
    category: categoryFromPath ?? params.get("category") ?? "",
    material: params.getAll("material"),
    application: params.getAll("application"),
    process: params.getAll("process"),
    type: params.getAll("type"),
    page: num(params.get("page"), 1),
    limit: PAGE_SIZE,
  };
}

/**
 * Writes state back to a URLSearchParams. Category is not written here because it lives in the path.
 * Changing any filter resets pagination.
 */
export function toSearchParams(q: ProductQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (q.search.trim()) p.set("search", q.search.trim());
  q.material.forEach((v) => p.append("material", v));
  q.application.forEach((v) => p.append("application", v));
  q.process.forEach((v) => p.append("process", v));
  q.type.forEach((v) => p.append("type", v));
  if (q.page > 1) p.set("page", String(q.page));
  return p;
}

export function activeFilterCount(q: ProductQuery): number {
  return (q.category ? 1 : 0) + q.material.length + q.application.length + q.process.length + q.type.length;
}
