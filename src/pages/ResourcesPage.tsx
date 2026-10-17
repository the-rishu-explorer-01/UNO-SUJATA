import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, FileText } from "lucide-react";
import Seo from "@/components/Seo";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/site/Reveal";
import CtaBand from "@/components/site/CtaBand";
import { api, type ResourceGroup } from "@/lib/api";
import { SITE_BASE } from "@/data/pages";

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResourcesPage() {
  const [groups, setGroups] = useState<ResourceGroup[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .resources()
      .then((g) => alive && setGroups(g))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  const hasDocuments = (groups ?? []).some((g) => g.items.length > 0);

  return (
    <>
      <Seo
        title="Resources | Catalogues, Technical Documents and Brochures | UNO SUJATA"
        description="Download UNO SUJATA catalogues, technical documents, brochures and quality documents. Only documents we have published are listed."
        path="/resources"
        jsonLd={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "UNO SUJATA resources", url: `${SITE_BASE}/resources` }}
      />
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Resources" }]} />
      <PageHero
        eyebrow="Resources"
        title="Catalogues and technical documents."
        lead="Documents appear here only after they have been uploaded and checked. If you need something that is not listed, ask us."
        actions={<Link to="/faq" className="btn-ghost">Read the FAQ</Link>}
      />

      <section className="bg-paper py-16 lg:py-24">
        <div className="container-x">
          {error && (
            <p role="alert" className="border border-red-900/30 bg-red-50 p-5 font-body text-sm text-red-900">
              Resources could not be loaded right now. Refresh the page, or <Link to="/contact" className="underline">contact us</Link> for a copy.
            </p>
          )}

          {!error && groups === null && (
            <div className="space-y-4" aria-busy="true">
              {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse bg-bone" />)}
            </div>
          )}

          {groups && !hasDocuments && (
            <Reveal className="border border-dashed border-ink/30 p-10 lg:p-16">
              <p className="eyebrow">Being prepared</p>
              <h2 className="mt-4 font-display text-3xl font-extrabold">Documents are not published yet.</h2>
              <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-ink/70">
                We would rather show nothing than a link that does not work. For the current product catalogue or a technical document, ask us and we will send it.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/contact" className="btn-primary">Ask for a document</Link>
                <Link to="/request-quote" className="btn-ghost">Request a Quote</Link>
              </div>
            </Reveal>
          )}

          {groups && hasDocuments && (
            <div className="space-y-16">
              {groups.filter((g) => g.items.length > 0).map((g) => (
                <section key={g.value} aria-labelledby={`res-${g.value}`}>
                  <h2 id={`res-${g.value}`} className="border-b border-ink pb-4 font-display text-2xl font-bold">{g.label}</h2>
                  <ul className="divide-y divide-line">
                    {g.items.map((r) => (
                      <li key={r.slug} className="grid gap-4 py-6 md:grid-cols-12 md:items-center">
                        <div className="flex gap-4 md:col-span-8">
                          <FileText size={22} className="mt-1 shrink-0 text-brass-deep" aria-hidden="true" />
                          <div className="min-w-0">
                            <h3 className="font-display text-lg font-bold">{r.title}</h3>
                            <p className="mt-1 font-body text-sm leading-relaxed text-ink/70">{r.description}</p>
                            <p className="mt-2 font-mono text-[11px] text-ink/65">
                              PDF{r.sizeBytes ? ` · ${formatSize(r.sizeBytes)}` : ""} · Updated {new Date(r.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="md:col-span-4 md:text-right">
                          <a
                            href={r.fileUrl}
                            download={r.fileName ?? undefined}
                            className="inline-flex min-h-11 items-center gap-2 border border-ink px-5 font-body text-sm font-semibold hover:bg-ink hover:text-bone"
                          >
                            <Download size={16} aria-hidden="true" /> Download PDF
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </section>

      <CtaBand title="Need something that is not listed?" text="Tell us the document, the part or the standard, and we will reply by email." />
    </>
  );
}
