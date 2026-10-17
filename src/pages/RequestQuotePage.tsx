import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Seo from "@/components/Seo";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import RfqForm, { type Prefill, type ProductOption } from "@/components/rfq/RfqForm";
import { api } from "@/lib/api";

type Ready = {
  status: "ready";
  prefill: Prefill;
  productName: string | null;
  products: ProductOption[];
  lookups: { industries: string[]; materials: string[]; applications: string[] };
  notice: string | null;
};

export default function RequestQuotePage() {
  const [params] = useSearchParams();
  const productSlug = params.get("product") ?? "";
  const drawingIntent = params.get("type") === "drawing";
  const [state, setState] = useState<Ready | { status: "loading" }>({ status: "loading" });

  // Load everything the form needs in parallel. A failure in any one piece only removes that piece.
  useEffect(() => {
    const c = new AbortController();
    setState({ status: "loading" });

    Promise.allSettled([
      productSlug ? api.productBySlug(productSlug, c.signal) : Promise.resolve(null),
      api.products({ limit: 48 }, c.signal),
      api.industries(),
      api.materials(c.signal),
      api.applications(c.signal),
    ]).then(([product, list, industries, materials, applications]) => {
      if (c.signal.aborted) return;

      const detail = product.status === "fulfilled" ? product.value : null;
      const products: ProductOption[] = list.status === "fulfilled"
        ? list.value.items.map((p) => ({ slug: p.slug, name: p.name, productCode: p.productCode, categoryName: p.categoryName }))
        : [];
      // A product linked from a page may sit outside the first 48 results. Include it so it can still be selected.
      if (detail && !products.some((p) => p.slug === detail.slug)) {
        products.unshift({ slug: detail.slug, name: detail.name, productCode: detail.productCode, categoryName: detail.categoryName });
      }

      setState({
        status: "ready",
        prefill: {
          product: detail?.slug ?? "",
          partNumber: detail?.productCode ?? "",
          categoryName: detail?.categoryName ?? "",
        },
        productName: detail?.name ?? null,
        products,
        lookups: {
          industries: industries.status === "fulfilled" ? industries.value.map((i) => i.name) : [],
          materials: materials.status === "fulfilled" ? materials.value.map((m) => m.name) : [],
          applications: applications.status === "fulfilled" ? applications.value.map((a) => a.name) : [],
        },
        notice:
          productSlug && product.status === "rejected"
            ? "That product could not be found. You can still describe what you need below."
            : null,
      });
    });

    return () => c.abort();
  }, [productSlug]);

  const title = drawingIntent ? "Send your drawing." : "Tell us what you need.";

  return (
    <>
      <Seo
        title="Request a Quote | UNO SUJATA"
        description="Request a quote for precision brass components. Share your drawing, specification and quantity. We reply by email."
        path="/request-quote"
        indexable={false}
      />

      <Breadcrumbs
        items={
          state.status === "ready" && state.productName
            ? [{ label: "Home", to: "/" }, { label: "Products", to: "/products" }, { label: state.productName }]
            : [{ label: "Home", to: "/" }, { label: "Request a quote" }]
        }
      />
      <section className="bg-bone pb-20 pt-14 lg:pt-20">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <p className="eyebrow">Request a quote</p>
            <h1 className="mt-4 font-display text-5xl font-extrabold leading-[1.02]">{title}</h1>
            <p className="mt-6 font-body text-base leading-relaxed text-ink/70">
              Share the part, the quantity and the application. Our engineers review what you send and reply by email with feasibility, material and pricing. Drawings are optional but help us answer faster.
            </p>
            {state.status === "ready" && state.productName && (
              <div className="mt-8 border-l-2 border-brass bg-paper p-5">
                <p className="eyebrow !text-[10px]">Requesting a quote for</p>
                <p className="mt-2 font-display text-lg font-bold">{state.productName}</p>
                {state.prefill.categoryName && <p className="mt-1 font-body text-sm text-ink/65">{state.prefill.categoryName}</p>}
                <Link to={`/products/${state.prefill.product}`} className="mt-3 inline-block font-body text-sm font-semibold underline underline-offset-4 hover:text-brass-deep">
                  Back to product
                </Link>
              </div>
            )}
          </aside>

          <div className="lg:col-span-7 lg:col-start-6">
            {state.status === "loading" && (
              <div className="space-y-6" aria-busy="true" aria-label="Loading form">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 w-full animate-pulse bg-paper" />
                ))}
              </div>
            )}

            {state.status === "ready" && (
              <>
                {state.notice && (
                  <p role="status" className="mb-8 border border-line bg-paper p-4 font-body text-sm text-ink/75">{state.notice}</p>
                )}
                <RfqForm prefill={state.prefill} products={state.products} lookups={state.lookups} />
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
