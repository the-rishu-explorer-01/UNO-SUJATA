import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Seo from "@/components/Seo";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/site/Reveal";
import CtaBand from "@/components/site/CtaBand";
import { api } from "@/lib/api";
import { industryContent } from "@/data/pages";
import type { Industry } from "@/types/catalog";

export default function IndustriesPage() {
  const [industries, setIndustries] = useState<Industry[]>([]);

  useEffect(() => {
    let alive = true;
    api.industries().then((list) => alive && setIndustries(list));
    return () => {
      alive = false;
    };
  }, []);

  // Only industries with written content are shown. Database rows without content are not published.
  const rows = industryContent.map((c) => {
    const live = industries.find((i) => i.slug === c.slug);
    return { ...c, summary: live?.summary ?? c.summary };
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Industries served by UNO SUJATA",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: rows.map((r, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `https://www.unosujata.com/industries/${r.slug}`,
        name: r.name,
      })),
    },
  };

  return (
    <>
      <Seo
        title="Industries We Serve | Electrical, Automotive, Gas | UNO SUJATA"
        description="Brass components for electrical, automotive, gas equipment, fasteners and industrial engineering. Built to your drawing in Jamnagar, Gujarat."
        path="/industries"
        jsonLd={jsonLd}
      />
      <PageHero
        eyebrow="Industries"
        title="Where our components go."
        lead="We make brass parts for five sectors. Each one has its own requirements, and each page below shows what those buyers need, what we make for them, and the products we already list."
      />

      <section className="bg-paper py-8 lg:py-12">
        <div className="container-x">
          <ol className="divide-y divide-line">
            {rows.map((r, i) => (
              <li key={r.slug}>
                <Reveal>
                  <Link
                    to={`/industries/${r.slug}`}
                    className="group grid gap-4 py-10 transition-colors md:grid-cols-12 md:items-start md:gap-8 lg:py-14"
                  >
                    <span className="font-mono text-xs text-brass-deep md:col-span-1">0{i + 1}</span>
                    <div className="md:col-span-5">
                      <h2 className="font-display text-3xl font-extrabold leading-tight transition-colors group-hover:text-brass-deep sm:text-4xl">
                        {r.name}
                      </h2>
                      <p className="mt-3 max-w-md font-body text-sm leading-relaxed text-ink/70">{r.summary}</p>
                    </div>
                    <ul className="space-y-1.5 font-body text-sm text-ink/65 md:col-span-4">
                      {r.components.slice(0, 3).map((c) => (
                        <li key={c} className="flex gap-2">
                          <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-brass" />
                          {c}
                        </li>
                      ))}
                    </ul>
                    <span className="inline-flex items-center gap-2 font-body text-sm font-semibold uppercase tracking-wider md:col-span-2 md:justify-end">
                      Explore <ArrowUpRight size={16} aria-hidden="true" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand
        title="Working in one of these sectors?"
        text="Send us the drawing or specification. We reply by email with feasibility, material and pricing."
      />
    </>
  );
}
