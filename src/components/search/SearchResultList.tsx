import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { flattenResults, GROUP_LABELS, type SearchItem } from "@/lib/searchItems";
import type { SearchResults } from "@/lib/api";

/**
 * Grouped results. Used by the search page and the command palette, so both read the same way.
 * `activeIndex` highlights one row for keyboard users; `onPick` lets the palette close after choosing.
 */
export default function SearchResultList({
  results,
  activeIndex = -1,
  onPick,
  idPrefix = "result",
}: {
  results: SearchResults;
  activeIndex?: number;
  onPick?: (item: SearchItem) => void;
  idPrefix?: string;
}) {
  const groups = flattenResults(results);
  let flat = -1;
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.group} aria-labelledby={`${idPrefix}-${g.group}`}>
          <h3 id={`${idPrefix}-${g.group}`} className="px-3 font-mono text-[11px] uppercase tracking-technical text-ink/65">
            {GROUP_LABELS[g.group]}
          </h3>
          <ul role="listbox" aria-label={GROUP_LABELS[g.group]} className="mt-2">
            {g.items.map((item) => {
              flat += 1;
              const index = flat;
              const active = index === activeIndex;
              return (
                <li key={`${item.group}-${item.to}-${item.label}`} role="option" id={`${idPrefix}-${index}`} aria-selected={active}>
                  <Link
                    to={item.to}
                    onClick={() => onPick?.(item)}
                    className={`group flex min-h-12 items-center justify-between gap-4 px-3 py-2.5 ${active ? "bg-bone" : "hover:bg-bone"}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-body text-sm font-semibold">{item.label}</span>
                      {item.meta && <span className="block truncate font-body text-xs text-ink/60">{item.meta}</span>}
                    </span>
                    <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-ink/35 group-hover:text-ink" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
