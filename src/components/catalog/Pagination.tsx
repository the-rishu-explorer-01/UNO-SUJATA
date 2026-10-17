interface Props {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}

/** Numbered pagination with ellipses. Renders nothing for a single page. */
export default function Pagination({ page, totalPages, onPage }: Props) {
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  const add = (n: number) => pages.push(n);
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) add(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="h-10 border border-ink/30 px-4 font-body text-sm disabled:opacity-40 enabled:hover:border-ink"
      >
        Previous
      </button>
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="px-2 font-mono text-sm text-ink/65" aria-hidden="true">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            aria-current={p === page ? "page" : undefined}
            className={`h-10 min-w-10 border px-3 font-mono text-sm ${p === page ? "border-ink bg-ink text-bone" : "border-ink/30 hover:border-ink"}`}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="h-10 border border-ink/30 px-4 font-body text-sm disabled:opacity-40 enabled:hover:border-ink"
      >
        Next
      </button>
    </nav>
  );
}
