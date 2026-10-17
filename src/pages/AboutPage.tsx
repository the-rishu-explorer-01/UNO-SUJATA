import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Seo from "@/components/Seo";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/site/Reveal";
import CtaBand from "@/components/site/CtaBand";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import { usePublicContent } from "@/hooks/usePublicContent";
import { company, trustFacts } from "@/data/company";
import { aboutFallbackBody, timeline, SITE_BASE } from "@/data/pages";

const BUSINESS_POINTS = [
  {
    title: "Quotes from a drawing",
    text: "We quote from the drawing, sample or specification you send, so each price refers to a defined part.",
  },
  {
    title: "A reference for every enquiry",
    text: "Each request gets a reference number that you can quote in follow-up emails.",
  },
  {
    title: "Export experience",
    text: `${company.exporterClaim} Ask us about supply to your country.`,
  },
];

export default function AboutPage() {
  const content = usePublicContent();
  const headline = content?.about?.headline || "Built on brass. Driven by precision.";
  const body = content?.about?.body || aboutFallbackBody;
  const paragraphs = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <>
      <Seo
        title="About UNO SUJATA | Brass Manufacturer in Jamnagar Since 1978"
        description="A family manufacturing company in Jamnagar, Gujarat, making brass components since 1978. Our history, our facility, our engineering approach and how we work with business customers."
        path="/about"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "About UNO SUJATA",
            url: `${SITE_BASE}/about`,
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "UNO SUJATA",
            legalName: company.legalName,
            foundingDate: String(company.founded),
            address: { "@type": "PostalAddress", streetAddress: company.address, addressLocality: "Jamnagar", addressRegion: "Gujarat", addressCountry: "IN" },
          },
        ]}
      />
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "About" }]} />
      <PageHero
        eyebrow="About UNO SUJATA"
        title={headline}
        lead={`Manufacturing since ${company.founded}, from ${company.location}.`}
        actions={<Link to="/capabilities" className="btn-ghost">See our capabilities</Link>}
      />

      <section className="bg-paper py-20 lg:py-28">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="eyebrow">Our story</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight">Heritage, then a working company.</h2>
          </Reveal>
          <div className="space-y-6 lg:col-span-7 lg:col-start-6">
            {paragraphs.map((p, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <p className="font-body text-lg leading-relaxed text-ink/80">{p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-steel py-16 text-bone">
        <div className="container-x grid grid-cols-2 gap-px bg-graphite lg:grid-cols-4">
          {trustFacts.map((f) => (
            <div key={f.label} className="bg-steel py-8 pr-4 lg:px-8">
              <p className="font-display text-4xl font-bold text-brass-light">{f.value}</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-technical text-bone/60">{f.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-bone py-20 lg:py-28" aria-labelledby="timeline-heading">
        <div className="container-x">
          <p className="eyebrow">Timeline</p>
          <h2 id="timeline-heading" className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">From a 200 sq. ft. start to today.</h2>
          <div className="relative mt-16">
            <span aria-hidden="true" className="absolute left-0 right-0 top-[7px] hidden h-px bg-ink/25 md:block" />
          <ol className="relative grid gap-12 md:grid-cols-5 md:gap-0">
            {timeline.map((t, i) => (
              <li key={t.label} className="relative pr-6 md:pr-8">
                <span aria-hidden="true" className={`relative block h-3.5 w-3.5 ${i === timeline.length - 1 ? "bg-brass" : "bg-ink"}`} />
                <Reveal delay={i * 0.08} className="mt-6">
                  <p className="font-mono text-xs uppercase tracking-technical text-brass-deep">{t.label}</p>
                  <h3 className="mt-2 font-display text-xl font-bold">{t.title}</h3>
                  <p className="mt-3 font-body text-sm leading-relaxed text-ink/70">{t.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-paper py-20 lg:py-28">
        <div className="container-x grid gap-14 lg:grid-cols-2">
          <Reveal>
            <p className="eyebrow">Jamnagar</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold">Based in Hapa Industrial Area.</h2>
            <p className="mt-5 font-body text-base leading-relaxed text-ink/75">
              The workshop is on the Jamnagar–Rajkot Highway in the Hapa Industrial Area, Gujarat.
            </p>
            <p className="mt-4 font-mono text-xs text-ink/60">{company.address}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="eyebrow">Engineering focus</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold">The drawing comes first.</h2>
            <p className="mt-5 font-body text-base leading-relaxed text-ink/75">
              Most of our work starts from a customer drawing, sample or specification. Engineering reviews it before we quote, so the part we agree to make is the part the drawing describes.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line bg-bone py-20 lg:py-28">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <p className="eyebrow">How we work with business customers</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight">Built for procurement and engineering teams.</h2>
          </Reveal>
          <ul className="space-y-8 lg:col-span-7 lg:col-start-6">
            {BUSINESS_POINTS.map((point, i) => (
              <li key={point.title}>
                <Reveal delay={i * 0.05} className="border-l-2 border-brass pl-6">
                  <p className="font-display text-xl font-bold">{point.title}</p>
                  <p className="mt-2 font-body text-sm leading-relaxed text-ink/70">{point.text}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-line bg-paper py-20">
        <Reveal className="container-x grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow">The group</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold">Part of the Sujata Group.</h2>
            <p className="mt-5 font-body text-base leading-relaxed text-ink/75">
              UNO SUJATA is the brand of {company.legalName}. The Sujata Group also has a machine division, which builds automatic machines of the sliding head, single spindle and rotary table types. Details are on our capabilities page.
            </p>
          </div>
          <div className="lg:col-span-4 lg:col-start-9 lg:self-end">
            <Link to="/capabilities" className="inline-flex items-center gap-2 font-body text-sm font-semibold uppercase tracking-wider hover:text-brass-deep">
              Capabilities <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
      </section>

      <CtaBand title="Tell us about the part." text="Send a drawing or a description. We reply by email with feasibility, material and pricing." />
    </>
  );
}
