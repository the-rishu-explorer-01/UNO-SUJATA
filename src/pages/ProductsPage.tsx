import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import Seo from "@/components/Seo";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import SearchBox from "@/components/catalog/SearchBox";
import FilterPanel, { type FacetKey } from "@/components/catalog/FilterPanel";
import FilterDrawer from "@/components/catalog/FilterDrawer";
import ActiveFilters from "@/components/catalog/ActiveFilters";
import ProductCard from "@/components/catalog/ProductCard";
import Pagination from "@/components/catalog/Pagination";
import { SkeletonGrid, EmptyResults, ErrorState } from "@/components/catalog/States";
import { useProductList } from "@/hooks/useProductList";
import { api } from "@/lib/api";
import { parseProductQuery, toSearchParams, activeFilterCount } from "@/lib/productQuery";
import type { FilterOption, ProductCategory, ProductQuery } from "@/types/catalog";

type Facets = { materials: FilterOption[]; applications: FilterOption[]; processes: FilterOption[]; types: FilterOption[] };

export default function ProductsPage() {
  const { slug: categorySlug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const resultsRef = useRef<HTMLDivElement>(null);

  const query = useMemo(() => parseProductQuery(params, categorySlug), [params, categorySlug]);
  const list = useProductList(query);

  const [categories, setCategories] = useState<ProductCategory[] | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [facetsError, setFacetsError] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categoriesError, setCategoriesError] = useState(false);
  // Stable identity: the drawer's effect depends on this, and must not re-run on every render.
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Lookups load once. Failure of filter options does not block search or results.
  useEffect(() => {
    const c = new AbortController();
    api.categories(c.signal).then(setCategories).catch(() => !c.signal.aborted && setCategoriesError(true));
    api.facets(c.signal).then(setFacets).catch(() => !c.signal.aborted && setFacetsError(true));
    return () => c.abort();
  }, []);

  const currentCategory = categories?.find((c) => c.slug === categorySlug);
  const categoryNotFound = !!categorySlug && categories !== null && !currentCategory;

  const basePath = categorySlug ? `/products/category/${categorySlug}` : "/products";
  const hasRefinement = !!query.search.trim() || activeFilterCount(query) > 0 || query.page > 1;
  const heading = currentCategory?.name ?? "Product catalogue";

  /** Writes the URL. Every change resets to page 1 unless a page is passed explicitly. */
  const write = useCallback(
    (next: ProductQuery, toPath = basePath) => {
      navigate({ pathname: toPath, search: toSearchParams({ ...next, page: next.page }).toString() });
    },
    [navigate, basePath]
  );

  const patch = (p: Partial<ProductQuery>) => write({ ...query, ...p, page: 1 });

  const setSearch = useCallback(
    (text: string) => {
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (text) next.set("search", text);
        else next.delete("search");
        next.delete("page");
        return next;
      });
    },
    [setParams]
  );

  const setCategory = (slug: string) => {
    const next = { ...query, page: 1 };
    const path = slug ? `/products/category/${slug}` : "/products";
    write(next, path);
  };

  const toggleFacet = (key: FacetKey, slug: string) => {
    const field = key as "material" | "application" | "process" | "type";
    const current = query[field];
    const values = current.includes(slug) ? current.filter((v) => v !== slug) : [...current, slug];
    patch({ [field]: values } as Partial<ProductQuery>);
  };

  const clearAll = () => navigate({ pathname: "/products" });

  const setPage = (p: number) => {
    setParams(toSearchParams({ ...query, page: p }));
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const total = list.data?.total ?? null;
  const from = list.data && list.data.total > 0 ? (list.data.page - 1) * list.data.limit + 1 : 0;
  const to = list.data ? Math.min(list.data.page * list.data.limit, list.data.total) : 0;

  const panelProps = {
    query,
    categories: categories ?? [],
    facets,
    facetsError,
    onCategory: setCategory,
    onToggle: toggleFacet,
    onClearAll: clearAll,
  };

  if (categoryNotFound) {
    return (
      <section className="bg-bone py-24">
        <Seo title="Category not found | UNO SUJATA" description="This product category does not exist." path="/products" indexable={false} />
        <div className="container-x">
          <p className="eyebrow">Category</p>
          <h1 className="mt-4 font-display text-5xl font-extrabold">Category not found.</h1>
          <button type="button" onClick={clearAll} className="btn-primary mt-8">View all products</button>
        </div>
      </section>
    );
  }

  return (
    <>
      <Seo
        title={`${heading} | Brass Components | UNO SUJATA`}
        description={currentCategory?.summary ?? "Browse precision brass components by category, material, application and process. Request a quote or send your drawing."}
        // Canonical always points to the base page, so filtered or paged views do not compete with it.
        path={basePath}
        indexable
      />

      <Breadcrumbs
        items={
          currentCategory
            ? [{ label: "Home", to: "/" }, { label: "Products", to: "/products" }, { label: currentCategory.name }]
            : [{ label: "Home", to: "/" }, { label: "Products" }]
        }
      />
      <section className="border-b border-line bg-bone pb-10 pt-14 lg:pt-20">
        <div className="container-x">
          <p className="eyebrow">{currentCategory ? "Category" : "Product catalogue"}</p>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.02] sm:text-6xl">{heading}</h1>
          <p className="mt-5 max-w-2xl font-body text-base leading-relaxed text-ink/70">
            {currentCategory?.summary ?? "Search or filter by material, application and process. Open any product for technical details, or request a quote."}
          </p>
          <div className="mt-10 max-w-3xl">
            <SearchBox value={query.search} onCommit={setSearch} loading={list.status === "loading"} />
          </div>
        </div>
      </section>

      <section className="bg-bone py-10 lg:py-14">
        <div className="container-x grid gap-12 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start" aria-label="Product filters">
            <FilterPanel {...panelProps} />
          </aside>

          <div ref={resultsRef} className="min-w-0 scroll-mt-28">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/15 pb-4">
              <p role="status" className="font-body text-sm text-ink/70" aria-live="polite">
                {list.status === "loading" && total === null && "Loading products…"}
                {list.status !== "error" && total !== null && (
                  total === 0 ? "0 products" : `Showing ${from}–${to} of ${total} product${total === 1 ? "" : "s"}`
                )}
                {list.status === "error" && "Results unavailable"}
              </p>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="btn-ghost !py-2.5 !text-xs lg:hidden"
                aria-haspopup="dialog"
              >
                <SlidersHorizontal size={15} /> Filters{activeFilterCount(query) > 0 ? ` (${activeFilterCount(query)})` : ""}
              </button>
            </div>

            <div className="mt-5">
              <ActiveFilters
                query={query}
                categories={categories ?? []}
                facets={facets}
                onRemoveCategory={() => setCategory("")}
                onRemove={toggleFacet}
                onRemoveSearch={() => setSearch("")}
                onClearAll={clearAll}
              />
            </div>

            <div className="mt-8">
              {list.status === "error" && !list.data && <ErrorState message={list.error} onRetry={list.retry} />}

              {list.status === "loading" && !list.data && <SkeletonGrid />}

              {list.data && list.data.total === 0 && (
                <EmptyResults hasFilters={hasRefinement} onClear={clearAll} />
              )}

              {list.data && list.data.total > 0 && (
                <div className={`transition-opacity ${list.status === "loading" ? "opacity-60" : "opacity-100"}`} aria-busy={list.status === "loading"}>
                  <div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
                    {list.data.items.map((p, i) => (
                      <ProductCard key={p.slug} product={p} eager={i < 2} />
                    ))}
                  </div>
                  <Pagination page={list.data.page} totalPages={list.data.totalPages} onPage={setPage} />
                </div>
              )}

              {list.status === "error" && list.data && (
                <p role="alert" className="mt-6 font-body text-sm text-red-700">
                  Could not refresh results. Showing the last loaded results. {list.error}
                </p>
              )}

              {categoriesError && (
                <p className="mt-6 font-body text-xs text-ink/65">Category details are unavailable right now.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <FilterDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        resultCount={total}
        {...panelProps}
      />
    </>
  );
}
