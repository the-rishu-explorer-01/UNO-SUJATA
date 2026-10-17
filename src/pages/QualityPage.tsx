import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/site/Reveal";
import CtaBand from "@/components/site/CtaBand";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import { SectionDrawing } from "@/components/site/Visuals";
import { usePublicContent } from "@/hooks/usePublicContent";
import { qualityFallbackIntro, qualityPrinciples, qualityStages, SITE_BASE } from "@/data/pages";

export default function QualityPage() {
  const content = usePublicContent();
  const intro = content?.quality?.intro || qualityFallbackIntro;
  const certs = content?.quality?.certifications ?? [];

  return (
    <>
      <Seo
        title="Quality Control | Inspected to the Print | UNO SUJATA"
        description="How UNO SUJATA inspects brass components: material, process and dimensional inspection against the drawing, final inspection, documentation and traceability."
        path="/quality"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Quality at UNO SUJATA",
          url: `${SITE_BASE}/quality`,
        }}
      />
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Quality" }]} />
      <PageHero
        eyebrow="Quality"
        title="Inspected to the print."
        lead={intro}
        visual={<SectionDrawing label="FIG. 04" />}
        actions={<Link to="/request-quote" className="btn-primary">Request a Quote</Link>}
      />

      <section className="bg-paper py-20 lg:py-28">
        <div className="container-x">
          <p className="eyebrow">Philosophy</p>
          <div className="mt-10 grid gap-12 md:grid-cols-3">
            {qualityPrinciples.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <p className="font-mono text-xs text-brass-deep">0{i + 1}</p>
                <h2 className="mt-3 font-display text-2xl font-bold">{p.title}</h2>
                <p className="mt-3 font-body text-sm leading-relaxed text-ink/70">{p.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-bone py-20 lg:py-28">
        <div className="container-x">
          <div className="grid gap-12 lg:grid-cols-12">
            <Reveal className="lg:col-span-4">
              <p className="eyebrow">Inspection stages</p>
              <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight">Checked at each stage, not only at the end.</h2>
            </Reveal>
            <ol className="divide-y divide-line border-y border-line lg:col-span-7 lg:col-start-6">
              {qualityStages.map((s, i) => (
                <li key={s.title}>
                  <Reveal delay={i * 0.03} className="grid gap-2 py-6 sm:grid-cols-[72px_1fr]">
                    <span className="font-mono text-xs text-brass-deep">Q{i + 1}</span>
                    <div>
                      <h3 className="font-display text-xl font-bold">{s.title}</h3>
                      <p className="mt-1.5 font-body text-sm leading-relaxed text-ink/70">{s.text}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="certifications" className="scroll-mt-24 bg-paper py-20 lg:py-28" aria-labelledby="cert-heading">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="eyebrow">Certifications</p>
            <h2 id="cert-heading" className="mt-4 font-display text-3xl font-extrabold leading-tight">Certificates and approvals</h2>
          </Reveal>
          <div className="lg:col-span-7 lg:col-start-6">
            {certs.length === 0 ? (
              <div className="border border-dashed border-ink/30 p-8">
                <p className="font-body text-sm leading-relaxed text-ink/70">
                  Certification details will appear here once they are verified. We only list certificates we can document. For current certificates, ask us during the quote.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {certs.map((c) => (
                  <li key={`${c.name}-${c.reference}`} className="grid gap-2 py-5 sm:grid-cols-3">
                    <span className="font-display text-lg font-bold">{c.name}</span>
                    <span className="font-body text-sm text-ink/70">{c.issuer}</span>
                    <span className="font-mono text-xs text-ink/60">
                      {c.reference}{c.validUntil ? ` · valid until ${c.validUntil}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-bone py-20">
        <Reveal className="container-x grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="eyebrow">Documentation and traceability</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold">Ask for the records you need.</h2>
            <p className="mt-4 max-w-xl font-body text-base leading-relaxed text-ink/75">
              Inspection records and traceability requirements differ by customer. Tell us what your quality process needs when you send the drawing, and we will confirm what we can provide.
            </p>
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <Link to="/contact" className="font-body text-sm font-semibold uppercase tracking-wider hover:text-brass-deep">Talk to us about your requirements →</Link>
          </div>
        </Reveal>
      </section>

      <CtaBand title="Build something precise." text="Share the drawing and your inspection requirements. We will confirm the approach before quoting." />
    </>
  );
}
