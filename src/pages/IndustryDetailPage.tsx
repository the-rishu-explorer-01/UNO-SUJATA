import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Seo from "@/components/Seo";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/site/Reveal";
import CtaBand from "@/components/site/CtaBand";
import { SectionDrawing } from "@/components/site/Visuals";
import { api } from "@/lib/api";
import { industryBySlug, industryContent, SITE_BASE } from "@/data/pages";
import type { ProductSummary } from "@/types/catalog";

export default function IndustryDetailPage() {
  const { slug = "" } = useParams();
  const content = industryBySlug(slug);
  const [products, setProducts] = useState<ProductSummary[] | null>(null);
  const [productsError, setProductsError] = useState(false);

  useEffect(() => {
    if (!content) return;
    let alive = true;
    setProducts(null);
    setProductsError(false);
    api
      .products({ application: content.applicationSlugs, limit: 6 })
      .then((res) => alive && setProducts(res.items))
      .catch(() => alive && setProductsError(true));
    return () => {
      alive = false;
    };
    // content is derived from slug, which is the only input that changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (!content) {
    return (
      <section className="bg-bone py-24">
        <Seo title="Industry not found | UNO SUJATA" description="This industry page does not exist." path="/industries" indexable={false} />
        <div className="container-x">
          <p className="eyebrow">Industries</p>
          <h1 className="mt-4 font-display text-5xl font-extrabold">Industry not found.</h1>
          <Link to="/industries" className="btn-primary mt-8">All industries</Link>
        </div>
      </section>
    );
  }

  const index = industryContent.findIndex((i) => i.slug === content.slug);
  const prev = industryContent[(index - 1 + industryContent.length) % industryContent.length];
  const next = industryContent[(index + 1) % industryContent.length];
  const path = `/industries/${content.slug}`;

  return (
    <>
      <Seo
        title={`${content.name} Components | Brass Parts for ${content.name} | UNO SUJATA`}
        description={content.summary}
        path={path}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `${content.name} | UNO SUJATA`,
            description: content.summary,
            url: `${SITE_BASE}${path}`,
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_BASE}/` },
              { "@type": "ListItem", position: 2, name: "Industries", item: `${SITE_BASE}/industries` },
              { "@type": "ListItem", position: 3, name: content.name, item: `${SITE_BASE}${path}` },
            ],
          },
        ]}
      />
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Industries", to: "/industries" }, { label: content.name }]} />

      <PageHero
        eyebrow="Industry"
        title={content.name}
        lead={content.summary}
        visual={<SectionDrawing label="FIG. 03" />}
        actions={
          <>
            <Link to="/request-quote" className="btn-primary">Request a Quote <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link to="/request-quote?type=drawing" className="btn-ghost">Send Your Drawing</Link>
          </>
        }
      />

      <section className="bg-paper py-20 lg:py-28">
        <div className="container-x grid gap-16 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="eyebrow">Requirement</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight">What buyers in this sector need</h2>
          </Reveal>
          <Reveal delay={0.05} className="lg:col-span-7 lg:col-start-6">
            <p className="font-body text-lg leading-relaxed text-ink/80">{content.requirement}</p>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-line bg-bone py-20 lg:py-28">
        <div className="container-x grid gap-16 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="eyebrow">Typical components</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight">What we make for {content.name.toLowerCase()}</h2>
          </Reveal>
          <ul className="divide-y divide-line border-y border-line lg:col-span-7 lg:col-start-6">
            {content.components.map((c, i) => (
              <li key={c}>
                <Reveal delay={i * 0.05} className="flex gap-6 py-5">
                  <span className="font-mono text-xs text-brass-deep">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-body text-base">{c}</span>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-paper py-20 lg:py-28">
        <div className="container-x grid gap-16 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="eyebrow">Our capability</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight">How we meet it</h2>
            <Link to="/capabilities" className="mt-6 inline-flex items-center gap-2 font-body text-sm font-semibold uppercase tracking-wider hover:text-brass-deep">
              Full capabilities <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </Reveal>
          <Reveal delay={0.05} className="lg:col-span-7 lg:col-start-6">
            <p className="font-body text-lg leading-relaxed text-ink/80">{content.capability}</p>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line bg-bone py-20 lg:py-28">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-6 border-b border-ink pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Relevant products</p>
              <h2 className="mt-4 font-display text-3xl font-extrabold">Already in our range</h2>
            </div>
            <Link to={`/products?application=${content.applicationSlugs[0]}`} className="font-body text-sm font-semibold uppercase tracking-wider hover:text-brass-deep">
              All {content.name} products →
            </Link>
          </div>

          {productsError && (
            <p role="alert" className="mt-8 font-body text-sm text-ink/70">Products could not be loaded right now. Try the <Link to="/products" className="underline">full catalogue</Link>.</p>
          )}
          {!productsError && products === null && (
            <div className="mt-8 space-y-4" aria-busy="true">
              {[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse bg-paper" />)}
            </div>
          )}
          {products && products.length === 0 && (
            <p className="mt-8 font-body text-sm text-ink/70">No published products for this sector yet. Send your drawing and we will confirm what we can make.</p>
          )}
          {products && products.length > 0 && (
            <ul className="divide-y divide-line">
              {products.map((p) => (
                <li key={p.slug} className="grid gap-3 py-5 md:grid-cols-12 md:items-center">
                  <Link to={`/products/${p.slug}`} className="font-display text-xl font-bold hover:text-brass-deep md:col-span-5">{p.name}</Link>
                  <span className="font-body text-sm text-ink/60 md:col-span-3">{p.categoryName}</span>
                  <span className="font-mono text-xs text-ink/65 md:col-span-2">{p.productCode ?? "Code on request"}</span>
                  <Link to={`/request-quote?product=${p.slug}`} className="font-body text-sm font-semibold uppercase tracking-wider hover:text-brass-deep md:col-span-2 md:text-right">
                    Request quote
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <CtaBand
        title={`Making parts for ${content.name.toLowerCase()}?`}
        text="Send the drawing or a sample. We will confirm feasibility, material and lead time before quoting."
      />

      <nav aria-label="Other industries" className="grid border-t border-line bg-paper md:grid-cols-2">
        <Link to={`/industries/${prev.slug}`} className="group border-b border-line p-8 hover:bg-bone md:border-b-0 md:border-r">
          <span className="font-mono text-[11px] uppercase tracking-technical text-ink/65">Previous</span>
          <span className="mt-2 block font-display text-2xl font-bold group-hover:text-brass-deep">{prev.name}</span>
        </Link>
        <Link to={`/industries/${next.slug}`} className="group p-8 text-right hover:bg-bone">
          <span className="font-mono text-[11px] uppercase tracking-technical text-ink/65">Next</span>
          <span className="mt-2 block font-display text-2xl font-bold group-hover:text-brass-deep">{next.name}</span>
        </Link>
      </nav>
    </>
  );
}
