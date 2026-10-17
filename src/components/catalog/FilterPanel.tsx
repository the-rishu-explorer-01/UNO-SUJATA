import type { FilterOption, ProductCategory, ProductQuery } from "@/types/catalog";

export type FacetKey = "material" | "application" | "process" | "type";

interface Facets {
  materials: FilterOption[];
  applications: FilterOption[];
  processes: FilterOption[];
  types: FilterOption[];
}

interface Props {
  query: ProductQuery;
  categories: ProductCategory[];
  facets: Facets | null;
  facetsError?: boolean;
  onCategory: (slug: string) => void;
  onToggle: (key: FacetKey, slug: string) => void;
  onClearAll: () => void;
}

const groups: { key: FacetKey; label: string; field: keyof Facets }[] = [
  { key: "type", label: "Product type", field: "types" },
  { key: "material", label: "Material", field: "materials" },
  { key: "application", label: "Application", field: "applications" },
  { key: "process", label: "Manufacturing process", field: "processes" },
];

/** Shared by the desktop sidebar and the mobile drawer. */
export default function FilterPanel({ query, categories, facets, facetsError, onCategory, onToggle, onClearAll }: Props) {
  const hasAny = !!query.category || query.material.length + query.application.length + query.process.length + query.type.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Filters</h2>
        {hasAny && (
          <button type="button" onClick={onClearAll} className="font-mono text-[11px] uppercase tracking-technical text-brass-deep underline underline-offset-4 hover:text-ink">
            Clear all
          </button>
        )}
      </div>

      <fieldset>
        <legend className="eyebrow mb-3">Category</legend>
        <ul className="space-y-1">
          <li>
            <label className="flex cursor-pointer items-center gap-3 py-1.5 font-body text-sm">
              <input type="radio" name="category" checked={!query.category} onChange={() => onCategory("")} className="accent-[#7D5F33]" />
              All categories
            </label>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5 font-body text-sm">
                <span className="flex items-center gap-3">
                  <input type="radio" name="category" checked={query.category === c.slug} onChange={() => onCategory(c.slug)} className="accent-[#7D5F33]" />
                  {c.name}
                </span>
                {c.productCount !== undefined && <span className="font-mono text-[11px] text-ink/65">{c.productCount}</span>}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      {facetsError && (
        <p role="alert" className="font-body text-sm text-red-700">Filter options could not be loaded. Search still works.</p>
      )}

      {!facetsError &&
        groups.map((g) => {
          const options = facets?.[g.field] ?? [];
          const selected = query[g.key === "type" ? "type" : g.key];
          return (
            <fieldset key={g.key}>
              <legend className="eyebrow mb-3">{g.label}</legend>
              {!facets ? (
                <div className="space-y-2" aria-hidden="true">
                  <div className="h-4 w-3/4 animate-pulse bg-line" />
                  <div className="h-4 w-1/2 animate-pulse bg-line" />
                </div>
              ) : options.length === 0 ? (
                <p className="font-body text-sm text-ink/65">No options yet</p>
              ) : (
                <ul className="space-y-1">
                  {options.map((o) => (
                    <li key={o.slug}>
                      <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5 font-body text-sm">
                        <span className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selected.includes(o.slug)}
                            onChange={() => onToggle(g.key, o.slug)}
                            className="h-4 w-4 accent-[#7D5F33]"
                          />
                          {o.name}
                        </span>
                        {o.count !== undefined && <span className="font-mono text-[11px] text-ink/65">{o.count}</span>}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </fieldset>
          );
        })}
    </div>
  );
}
