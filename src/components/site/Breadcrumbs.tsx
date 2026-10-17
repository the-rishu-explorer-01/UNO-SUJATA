import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="border-b border-line bg-bone">
      <ol className="container-x flex flex-wrap items-center gap-2 py-4 font-mono text-[11px] uppercase tracking-technical text-ink/60">
        {items.map((c, i) => (
          <li key={`${c.label}-${i}`} className="flex items-center gap-2">
            {i > 0 && <ChevronRight size={12} aria-hidden="true" />}
            {c.to && i < items.length - 1 ? (
              <Link to={c.to} className="hover:text-ink">{c.label}</Link>
            ) : (
              <span className="text-ink" aria-current={i === items.length - 1 ? "page" : undefined}>{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
