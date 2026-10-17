import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Search, X } from "lucide-react";
import { SEARCH_OPEN_EVENT } from "@/components/search/openSearch";
import SearchResultList from "@/components/search/SearchResultList";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSearch } from "@/hooks/useSearch";
import { api, type SearchSuggestions } from "@/lib/api";
import { clearRecentSearches, getRecentSearches, rememberSearch } from "@/lib/searchRecent";
import { flattenResults, totalResults, type SearchItem } from "@/lib/searchItems";

/** Mounted once in the public layout. Opens on the header button, Ctrl/Cmd+K, or the search event. */
export default function SearchPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(SEARCH_OPEN_EVENT, show);
    return () => window.removeEventListener(SEARCH_OPEN_EVENT, show);
  }, []);
  if (!open) return null;
  return <PaletteDialog onClose={() => setOpen(false)} />;
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [active, setActive] = useState(-1);
  const [attempt, setAttempt] = useState(0);
  const [suggestions, setSuggestions] = useState<SearchSuggestions | null>(null);
  const [recent, setRecent] = useState<string[]>(() => getRecentSearches());
  const debounced = useDebouncedValue(text, 180);
  const state = useSearch(debounced, attempt);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    returnFocus.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    let alive = true;
    api.searchSuggestions().then((s) => alive && setSuggestions(s)).catch(() => undefined);
    return () => {
      alive = false;
      document.body.style.overflow = "";
      returnFocus.current?.focus?.();
    };
  }, []);

  // Escape closes. Tab cycles inside the dialog, so focus cannot move to the page behind it.
  useEffect(() => {
    const dialog = dialogRef.current;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (current === first || !dialog.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !dialog.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Keep the highlighted row valid when results change.
  useEffect(() => setActive(-1), [debounced]);

  const items: SearchItem[] = state.data ? flattenResults(state.data).flatMap((g) => g.items) : [];
  const hasQuery = text.trim().length >= 2;

  const go = (to: string) => {
    rememberSearch(text);
    onClose();
    navigate(to);
  };

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && items[active]) go(items[active].to);
      else if (hasQuery) go(`/search?q=${encodeURIComponent(text.trim())}`);
    }
  };

  const total = state.data ? totalResults(state.data) : 0;
  const showEmpty = hasQuery && state.status === "ready" && total === 0;

  return (
    <div className="fixed inset-0 z-[70]" role="presentation">
      <button type="button" aria-label="Close search" className="absolute inset-0 hidden bg-ink/60 md:block" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search UNO SUJATA"
        className="absolute inset-0 flex flex-col bg-paper md:inset-auto md:left-1/2 md:top-[10vh] md:max-h-[80vh] md:w-[min(720px,calc(100vw-2rem))] md:-translate-x-1/2 md:border md:border-ink md:shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
          <Search size={20} className="shrink-0 text-ink/65" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls="palette-results"
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `palette-${active}` : undefined}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 100))}
            onKeyDown={onInputKey}
            placeholder="Search products, industries, resources…"
            autoComplete="off"
            maxLength={100}
            className="min-h-12 flex-1 bg-transparent font-body text-base outline-none placeholder:text-ink/65"
          />
          <button type="button" onClick={onClose} aria-label="Close search" className="inline-flex h-11 w-11 items-center justify-center hover:text-brass-deep">
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4 sm:px-3" id="palette-results">
          {!hasQuery && (
            <div className="space-y-8 px-2">
              {recent.length > 0 && (
                <section aria-labelledby="recent-heading">
                  <div className="flex items-center justify-between">
                    <h3 id="recent-heading" className="font-mono text-[11px] uppercase tracking-technical text-ink/65">Recent searches</h3>
                    <button type="button" className="font-body text-xs font-semibold underline underline-offset-4" onClick={() => { clearRecentSearches(); setRecent([]); }}>Clear</button>
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {recent.map((r) => (
                      <li key={r}>
                        <button type="button" onClick={() => setText(r)} className="min-h-10 border border-ink/25 px-3 font-body text-sm hover:border-ink">{r}</button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section aria-labelledby="suggest-heading">
                <h3 id="suggest-heading" className="font-mono text-[11px] uppercase tracking-technical text-ink/65">Suggestions</h3>
                <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                  {(suggestions?.categories ?? []).map((c) => (
                    <li key={c.slug}>
                      <Link to={`/products/category/${c.slug}`} onClick={onClose} className="flex min-h-11 items-center justify-between px-3 font-body text-sm hover:bg-bone">
                        {c.name} <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                  {(suggestions?.pages ?? []).map((p) => (
                    <li key={p.path}>
                      <Link to={p.path} onClick={onClose} className="flex min-h-11 items-center justify-between px-3 font-body text-sm hover:bg-bone">
                        {p.title} <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
              <p className="px-1 font-body text-xs text-ink/65">Search is for this visit only. Searches are not stored on our servers.</p>
            </div>
          )}

          {hasQuery && state.status === "loading" && !state.data && (
            <div className="space-y-3 px-3" aria-busy="true" aria-label="Searching">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse bg-bone" />)}
            </div>
          )}

          {hasQuery && state.status === "error" && (
            <div role="alert" className="mx-3 border border-red-900/30 bg-red-50 p-4">
              <p className="font-body text-sm text-red-900">{state.error}</p>
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-3 font-body text-sm font-semibold underline underline-offset-4">Try again</button>
            </div>
          )}

          {showEmpty && (
            <div role="status" className="px-3 py-6">
              <p className="font-display text-xl font-bold">No results for “{text.trim()}”.</p>
              <p className="mt-2 font-body text-sm text-ink/65">Try a shorter term, or browse the product categories. You can also send us your drawing.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/products" onClick={onClose} className="btn-ghost !min-h-10 !py-2 !text-xs">Browse products</Link>
                <Link to="/request-quote?type=drawing" onClick={onClose} className="btn-primary !min-h-10 !py-2 !text-xs">Send your drawing</Link>
              </div>
            </div>
          )}

          {state.data && total > 0 && (
            <SearchResultList results={state.data} activeIndex={active} onPick={(item) => go(item.to)} idPrefix="palette" />
          )}
        </div>

        {hasQuery && total > 0 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 font-body text-sm sm:px-5">
            <span className="text-ink/60">{total} result{total === 1 ? "" : "s"}</span>
            <button type="button" onClick={() => go(`/search?q=${encodeURIComponent(text.trim())}`)} className="font-semibold underline underline-offset-4">
              See all results
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
