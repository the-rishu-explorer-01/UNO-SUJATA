import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Seo from "@/components/Seo";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import SearchResultList from "@/components/search/SearchResultList";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useSearch } from "@/hooks/useSearch";
import { api, type SearchSuggestions } from "@/lib/api";
import { getRecentSearches, rememberSearch } from "@/lib/searchRecent";
import { totalResults } from "@/lib/searchItems";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  const [text, setText] = useState(urlQuery);
  const [attempt, setAttempt] = useState(0);
  const debounced = useDebouncedValue(text, 250);
  const state = useSearch(debounced, attempt);
  const [suggestions, setSuggestions] = useState<SearchSuggestions | null>(null);
  const [recent] = useState<string[]>(() => getRecentSearches());

  useEffect(() => {
    let alive = true;
    api.searchSuggestions().then((s) => alive && setSuggestions(s)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // Typed queries replace the current history entry rather than adding one, so the back button is not filled with searches.
  const lastWritten = useRef(urlQuery);
  useEffect(() => {
    const next = debounced.trim();
    if (next === urlQuery.trim()) return;
    lastWritten.current = next;
    setParams(next ? { q: next } : {}, { replace: true });
  }, [debounced, urlQuery, setParams]);

  // Follow the URL only when it changed from outside (a link, the back button). Our own writes are ignored,
  // so a pause in typing can never overwrite what the person is typing.
  useEffect(() => {
    if (urlQuery !== lastWritten.current) {
      lastWritten.current = urlQuery;
      setText(urlQuery);
    }
  }, [urlQuery]);

  const hasQuery = text.trim().length >= 2;
  const total = state.data ? totalResults(state.data) : 0;

  return (
    <>
      <Seo title="Search | UNO SUJATA" description="Search UNO SUJATA products, industries, capabilities, resources and pages." path="/search" indexable={false} />
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Search" }]} />

      <section className="border-b border-line bg-bone pb-12 pt-12 lg:pt-16">
        <div className="container-x">
          <p className="eyebrow">Search</p>
          <h1 className="mt-4 font-display text-4xl font-extrabold sm:text-5xl">Find a part, an industry or a document.</h1>
          <form role="search" className="mt-8 max-w-3xl" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="site-search" className="sr-only">Search the site</label>
            <input
              id="site-search"
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 100))}
              placeholder="Try “brass pin”, “electrical” or “inspection”"
              autoComplete="off"
              maxLength={100}
              autoFocus
              className="h-14 w-full border border-ink bg-paper px-4 font-body text-base placeholder:text-ink/65 focus:outline-none focus:ring-2 focus:ring-brass"
            />
            <p className="mt-2 font-body text-xs text-ink/65" aria-live="polite">
              {hasQuery && state.status === "loading" && "Searching…"}
              {hasQuery && state.status === "ready" && `${total} result${total === 1 ? "" : "s"}`}
            </p>
          </form>
        </div>
      </section>

      <section className="bg-paper py-12 lg:py-16">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-8">
            {!hasQuery && (
              <div className="space-y-10">
                {recent.length > 0 && (
                  <div>
                    <h2 className="font-mono text-[11px] uppercase tracking-technical text-ink/65">Recent searches</h2>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {recent.map((r) => (
                        <li key={r}><button type="button" onClick={() => setText(r)} className="min-h-10 border border-ink/25 px-3 font-body text-sm hover:border-ink">{r}</button></li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="font-body text-base text-ink/65">Start typing to search across products, categories, industries, capabilities, resources and pages.</p>
              </div>
            )}

            {hasQuery && state.status === "loading" && !state.data && (
              <div className="space-y-3" aria-busy="true" aria-label="Searching">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse bg-bone" />)}
              </div>
            )}

            {hasQuery && state.status === "error" && (
              <div role="alert" className="border border-red-900/30 bg-red-50 p-6">
                <p className="font-body text-sm text-red-900">{state.error}</p>
                <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-3 font-body text-sm font-semibold underline underline-offset-4">Try again</button>
              </div>
            )}

            {hasQuery && state.status === "ready" && total === 0 && (
              <div role="status" className="border border-dashed border-ink/30 p-8">
                <p className="font-display text-2xl font-bold">No results for “{text.trim()}”.</p>
                <p className="mt-3 font-body text-sm text-ink/70">Try a shorter term or a different word. If you need a part we do not list, send us the drawing and we will tell you what we can make.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/products" className="btn-ghost !min-h-10 !py-2 !text-xs">Browse products</Link>
                  <Link to="/request-quote?type=drawing" className="btn-primary !min-h-10 !py-2 !text-xs">Send your drawing</Link>
                </div>
              </div>
            )}

            {state.data && total > 0 && (
              <SearchResultList results={state.data} onPick={() => rememberSearch(text)} idPrefix="page" />
            )}
          </div>

          <aside className="lg:col-span-3 lg:col-start-10" aria-label="Browse">
            <h2 className="font-mono text-[11px] uppercase tracking-technical text-ink/65">Browse</h2>
            <ul className="mt-4 space-y-3 font-body text-sm">
              {(suggestions?.categories ?? []).map((c) => (
                <li key={c.slug}><Link to={`/products/category/${c.slug}`} className="hover:text-brass-deep">{c.name}</Link></li>
              ))}
              {(suggestions?.pages ?? []).map((p) => (
                <li key={p.path}><Link to={p.path} className="hover:text-brass-deep">{p.title}</Link></li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}
