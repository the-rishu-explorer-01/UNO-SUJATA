import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, FileUp } from "lucide-react";
import Seo from "@/components/Seo";
import ProductImage from "@/components/catalog/ProductImage";
import ProductCard from "@/components/catalog/ProductCard";
import SpecTable, { type SpecRow } from "@/components/catalog/SpecTable";
import ProductFiles from "@/components/product/ProductFiles";
import { ErrorState } from "@/components/catalog/States";
import { api, ApiError } from "@/lib/api";
import type { ProductDetail } from "@/types/catalog";

const SITE = "https://www.unosujata.com";
const absolute = (url: string) => (url.startsWith("http") ? url : `${SITE}${url}`);

type State =
  | { status: "loading" }
  | { status: "ready"; product: ProductDetail }
  | { status: "notFound" }
  | { status: "error"; message: string };

export default function ProductDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    const c = new AbortController();
    setState({ status: "loading" });
    setActiveImage(0);
    api
      .productBySlug(slug, c.signal)
      .then((product) => setState({ status: "ready", product }))
      .catch((err: unknown) => {
        if (c.signal.aborted) return;
        if (err instanceof ApiError && err.status === 404) setState({ status: "notFound" });
        else setState({ status: "error", message: err instanceof Error ? err.message : "Unknown error" });
      });
    return () => c.abort();
  }, [slug, attempt]);

  if (state.status === "loading") {
    return (
      <section className="container-x py-20" aria-label="Loading product">
        <div className="h-4 w-48 animate-pulse bg-line" />
        <div className="mt-10 grid gap-12 lg:grid-cols-2">
          <div className="aspect-[4/3] animate-pulse bg-bone" />
          <div className="space-y-4">
            <div className="h-10 w-3/4 animate-pulse bg-bone" />
            <div className="h-4 w-full animate-pulse bg-bone" />
            <div className="h-4 w-2/3 animate-pulse bg-bone" />
          </div>
        </div>
      </section>
    );
  }

  if (state.status === "notFound") {
    return (
      <section className="bg-bone py-24">
        <Seo title="Product not found | UNO SUJATA" description="This product is not available." path="/products" indexable={false} />
        <div className="container-x">
          <p className="eyebrow">Product</p>
          <h1 className="mt-4 font-display text-5xl font-extrabold">This product is not available.</h1>
          <p className="mt-4 max-w-xl font-body text-base text-ink/70">
            The link may be out of date, or the product may have been removed. Browse the catalogue or send us your requirement.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/products" className="btn-primary">Browse products</Link>
            <Link to="/request-quote" className="btn-ghost">Request a Quote</Link>
          </div>
        </div>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="container-x py-20">
        <ErrorState message={state.message} onRetry={() => setAttempt((n) => n + 1)} />
      </section>
    );
  }

  return <ProductView product={state.product} activeImage={activeImage} onImage={setActiveImage} />;
}

function ProductView({
  product: p,
  activeImage,
  onImage,
}: {
  product: ProductDetail;
  activeImage: number;
  onImage: (i: number) => void;
}) {
  const current = p.images[activeImage] ?? null;

  const specs: SpecRow[] = [
    { label: "Product code", value: p.productCode },
    { label: "Category", value: p.categoryName },
    { label: "Product type", value: p.productType },
    { label: "Material", value: p.materials.join(", ") || null },
    { label: "Application", value: p.applications.join(", ") || null },
    { label: "Manufacturing process", value: p.processes.join(", ") || null },
    { label: "Available finishes", value: p.finishes.join(", ") || null },
    { label: "Dimensions", value: "As per drawing" },
    ...(p.specifications ?? []).map((s) => ({ label: s.label, value: s.value })),
  ];

  const quoteHref = `/request-quote?product=${encodeURIComponent(p.slug)}`;
  const drawingHref = `${quoteHref}&type=drawing`;
  const path = `/products/${p.slug}`;

  const jsonLd = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.name,
        description: p.description,
        category: p.categoryName,
        ...(p.productCode ? { sku: p.productCode, mpn: p.productCode } : {}),
        ...(p.materials.length ? { material: p.materials.join(", ") } : {}),
        brand: { "@type": "Brand", name: "UNO SUJATA" },
        manufacturer: { "@type": "Organization", name: "UNO SUJATA" },
        ...(p.images.length ? { image: p.images.map((i) => absolute(i.url)) } : {}),
        url: `${SITE}${path}`,
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Products", item: `${SITE}/products` },
          { "@type": "ListItem", position: 2, name: p.categoryName, item: `${SITE}/products/category/${p.categorySlug}` },
          { "@type": "ListItem", position: 3, name: p.name, item: `${SITE}${path}` },
        ],
      },
    ],
    [p]
  );

  return (
    <>
      <Seo
        title={`${p.name} | ${p.categoryName} | UNO SUJATA`}
        description={p.description}
        path={path}
        type="product"
        image={p.image ? absolute(p.image.url) : undefined}
        jsonLd={jsonLd}
      />

      <nav aria-label="Breadcrumb" className="border-b border-line bg-bone">
        <ol className="container-x flex flex-wrap items-center gap-2 py-4 font-mono text-[11px] uppercase tracking-technical text-ink/60">
          <li><Link to="/products" className="hover:text-ink">Products</Link></li>
          <li aria-hidden="true"><ChevronRight size={12} /></li>
          <li><Link to={`/products/category/${p.categorySlug}`} className="hover:text-ink">{p.categoryName}</Link></li>
          <li aria-hidden="true"><ChevronRight size={12} /></li>
          <li className="text-ink" aria-current="page">{p.name}</li>
        </ol>
      </nav>

      <section className="bg-bone py-12 lg:py-20">
        <div className="container-x grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <div className="border border-line bg-paper p-4">
              <ProductImage image={current} eager />
            </div>
            {p.images.length > 1 && (
              <ul className="mt-3 grid grid-cols-4 gap-3" aria-label="Product images">
                {p.images.map((img, i) => (
                  <li key={img.url + i}>
                    <button
                      type="button"
                      onClick={() => onImage(i)}
                      aria-label={`Show image ${i + 1}`}
                      aria-pressed={i === activeImage}
                      className={`block w-full border ${i === activeImage ? "border-ink" : "border-line"}`}
                    >
                      <img src={img.url} alt="" loading="lazy" width={160} height={120} className="aspect-[4/3] w-full object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:col-span-6">
            <p className="eyebrow">{p.categoryName}</p>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.02] sm:text-5xl">{p.name}</h1>
            <p className="mt-3 font-mono text-xs text-ink/60">
              Product code: {p.productCode ?? <span className="italic">Available on request</span>}
            </p>
            <p className="mt-6 font-body text-base leading-relaxed text-ink/75">{p.description}</p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link to={quoteHref} className="btn-primary">Request a Quote</Link>
              <Link to={drawingHref} className="btn-ghost"><FileUp size={16} /> Send Drawing</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-paper py-16 lg:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">Technical information</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold">Specification</h2>
            <p className="mt-4 font-body text-sm leading-relaxed text-ink/65">
              Values not yet confirmed are shown as “Available on request”. For a full specification sheet, request a quote.
            </p>
          </div>
          <div className="lg:col-span-8">
            <SpecTable rows={specs} />
          </div>
        </div>
      </section>

      {p.related.length > 0 && (
        <section className="border-t border-line bg-bone py-16 lg:py-24" aria-labelledby="related-heading">
          <div className="container-x">
            <div className="flex flex-wrap items-end justify-between gap-6 border-b border-ink pb-6">
              <div>
                <p className="eyebrow">Related</p>
                <h2 id="related-heading" className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">You may also need</h2>
              </div>
              <Link to={`/products/category/${p.categorySlug}`} className="font-body text-sm font-semibold uppercase tracking-wider hover:text-brass-deep">
                All {p.categoryName} →
              </Link>
            </div>
            <div className="mt-px grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
              {p.related.map((r) => (
                <ProductCard key={r.slug} product={r} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-line bg-paper py-16 lg:py-24">
        <div className="container-x">
          <ProductFiles slug={p.slug} productName={p.name} />
        </div>
      </section>

      <section className="bg-steel py-16 text-bone">
        <div className="container-x flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-3xl font-extrabold">Have a drawing for this part?</h2>
            <p className="mt-3 max-w-xl font-body text-bone/70">Send the drawing, sample or specification. We will confirm feasibility and material before quoting.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to={quoteHref} className="btn-primary !bg-brass !text-ink hover:!bg-brass-light">Request a Quote</Link>
            <Link to={drawingHref} className="btn-ghost !border-bone/30 !text-bone hover:!border-bone">Send Drawing</Link>
          </div>
        </div>
      </section>
    </>
  );
}
