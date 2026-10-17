import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/site/Reveal";
import CtaBand from "@/components/site/CtaBand";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import { ProcessLine } from "@/components/site/Visuals";
import { capabilitySections, SITE_BASE } from "@/data/pages";

const allSteps = capabilitySections.flatMap((s) => s.steps.map((st) => st.title));

export default function CapabilitiesPage() {
  return (
    <>
      <Seo
        title="Manufacturing Capabilities | Turning, Machining, Inspection | UNO SUJATA"
        description="From requirement to dispatch: engineering review, material selection, turning, machining, automatic machining, dimensional inspection and packing."
        path="/capabilities"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Manufacturing capabilities | UNO SUJATA",
          url: `${SITE_BASE}/capabilities`,
        }}
      />
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Capabilities" }]} />
      <PageHero
        eyebrow="Capabilities"
        title="Made to the drawing, from the first review."
        lead="Turned and machined brass components, manufactured to the print and checked against the drawing before they leave the workshop."
        actions={
          <>
            <Link to="/request-quote" className="btn-primary">Request a Quote</Link>
            <Link to="/request-quote?type=drawing" className="btn-ghost">Send Your Drawing</Link>
          </>
        }
      />

      <section className="bg-paper py-16 lg:py-20">
        <div className="container-x">
          <p className="eyebrow">The route through the workshop</p>
          <div className="mt-8 hidden md:block">
            <ProcessLine count={allSteps.length} labels={allSteps} />
          </div>
          <ol className="mt-8 grid gap-x-8 gap-y-2 font-body text-sm text-ink/70 md:hidden">
            {allSteps.map((s, i) => (
              <li key={s} className="flex gap-3"><span className="font-mono text-xs text-brass-deep">{String(i + 1).padStart(2, "0")}</span>{s}</li>
            ))}
          </ol>
        </div>
      </section>

      {capabilitySections.map((section, si) => (
        <section key={section.heading} className={`py-20 lg:py-28 ${si % 2 === 0 ? "bg-bone" : "bg-paper"} border-t border-line`}>
          <div className="container-x grid gap-14 lg:grid-cols-12">
            <Reveal className="lg:col-span-4">
              <p className="font-mono text-[11px] uppercase tracking-technical text-brass-deep">Stage {String(si + 1).padStart(2, "0")}</p>
              <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight sm:text-4xl">{section.heading}</h2>
              <p className="mt-4 font-body text-sm leading-relaxed text-ink/65">{section.intro}</p>
            </Reveal>
            <ol className="lg:col-span-7 lg:col-start-6">
              {section.steps.map((step, i) => (
                <li key={step.title} className="relative border-l border-ink/25 pb-12 pl-10 last:pb-0">
                  <span aria-hidden="true" className="absolute -left-[5px] top-2 h-2.5 w-2.5 bg-brass" />
                  <Reveal delay={i * 0.04}>
                    <p className="font-mono text-[11px] text-ink/65">{String(si * 4 + i + 1).padStart(2, "0")}</p>
                    <h3 className="mt-1 font-display text-2xl font-bold">{step.title}</h3>
                    <p className="mt-2 max-w-xl font-body text-base leading-relaxed text-ink/75">{step.text}</p>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ))}

      <section className="border-t border-line bg-bone py-20">
        <Reveal className="container-x grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow">Measuring</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold">Dimensions are checked, not assumed.</h2>
            <p className="mt-4 max-w-xl font-body text-base leading-relaxed text-ink/75">
              Our measuring instruments are used to check dimensions against your drawing. Ask us for the inspection approach for your part during the quote.
            </p>
          </div>
          <div className="lg:col-span-4 lg:col-start-9 lg:self-end">
            <Link to="/quality" className="font-body text-sm font-semibold uppercase tracking-wider hover:text-brass-deep">Quality and inspection →</Link>
          </div>
        </Reveal>
      </section>

      <CtaBand title="Send us the part. We will tell you what it takes." text="Drawings, samples and specifications are all welcome. Engineering reviews each one before we quote." />
    </>
  );
}
