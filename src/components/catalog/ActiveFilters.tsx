import { X } from "lucide-react";
import type { FilterOption, ProductCategory, ProductQuery } from "@/types/catalog";
import type { FacetKey } from "@/components/catalog/FilterPanel";

interface Props {
  query: ProductQuery;
  categories: ProductCategory[];
  facets: { materials: FilterOption[]; applications: FilterOption[]; processes: FilterOption[]; types: FilterOption[] } | null;
  onRemoveCategory: () => void;
  onRemove: (key: FacetKey, slug: string) => void;
  onRemoveSearch: () => void;
  onClearAll: () => void;
}

/** Individual removable chips for every active search term and filter, plus Clear all. */
export default function ActiveFilters({ query, categories, facets, onRemoveCategory, onRemove, onRemoveSearch, onClearAll }: Props) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (query.search.trim()) chips.push({ key: "search", label: `“${query.search.trim()}”`, onRemove: onRemoveSearch });
  if (query.category) {
    const name = categories.find((c) => c.slug === query.category)?.name ?? query.category;
    chips.push({ key: "category", label: name, onRemove: onRemoveCategory });
  }

  const pairs: { key: FacetKey; values: string[]; options: FilterOption[] | undefined }[] = [
    { key: "type", values: query.type, options: facets?.types },
    { key: "material", values: query.material, options: facets?.materials },
    { key: "application", values: query.application, options: facets?.applications },
    { key: "process", values: query.process, options: facets?.processes },
  ];
  for (const p of pairs) {
    for (const v of p.values) {
      const name = p.options?.find((o) => o.slug === v)?.name ?? v;
      chips.push({ key: `${p.key}-${v}`, label: name, onRemove: () => onRemove(p.key, v) });
    }
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1.5 border border-ink/30 bg-paper py-1 pl-3 pr-1 font-body text-sm">
          {c.label}
          <button type="button" aria-label={`Remove ${c.label}`} onClick={c.onRemove} className="inline-flex h-7 w-7 items-center justify-center hover:text-brass-deep">
            <X size={14} />
          </button>
        </span>
      ))}
      <button type="button" onClick={onClearAll} className="ml-1 font-mono text-[11px] uppercase tracking-technical text-brass-deep underline underline-offset-4 hover:text-ink">
        Clear all
      </button>
    </div>
  );
}
