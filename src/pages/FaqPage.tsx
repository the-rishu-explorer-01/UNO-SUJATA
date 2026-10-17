import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import Seo from "@/components/Seo";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import PageHero from "@/components/site/PageHero";
import CtaBand from "@/components/site/CtaBand";
import { api, type FaqGroup } from "@/lib/api";
import { faqEntries, FAQ_CATEGORY_LABELS } from "@/data/faq";

/** Used only if the API cannot be reached. Same answers as the database seed. */
function fallbackGroups(): FaqGroup[] {
  const order = Object.keys(FAQ_CATEGORY_LABELS) as (keyof typeof FAQ_CATEGORY_LABELS)[];
  return order
    .map((value) => ({
      value,
      label: FAQ_CATEGORY_LABELS[value],
      items: faqEntries.filter((f) => f.category === value).map((f, i) => ({ id: `${value}-${i}`, question: f.question, answer: f.answer })),
    }))
    .filter((g) => g.items.length > 0);
}

export default function FaqPage() {
  const [groups, setGroups] = useState<FaqGroup[] | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .faqs()
      .then((g) => alive && setGroups(g))
      .catch(() => {
        if (!alive) return;
        setFallback(true);
        setGroups(fallbackGroups());
      });
    return () => {
      alive = false;
    };
  }, []);

  // FAQPage structured data is generated from exactly the answers shown on the page.
  const jsonLd = useMemo(() => {
    if (!groups) return null;
    const entities = groups.flatMap((g) => g.items).map((i) => ({
      "@type": "Question",
      name: i.question,
      acceptedAnswer: { "@type": "Answer", text: i.answer },
    }));
    return entities.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: entities } : null;
  }, [groups]);

  return (
    <>
      <Seo
        title="FAQ | Custom Brass Components, Drawings and Quotes | UNO SUJATA"
        description="Answers about custom brass components, drawing formats, materials, the quote process and quality at UNO SUJATA."
        path="/faq"
        jsonLd={jsonLd ?? undefined}
      />
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "FAQ" }]} />
      <PageHero
        eyebrow="Frequently asked questions"
        title="Answers before you ask."
        lead="These answers cover ordering, custom parts, drawings, materials, the quote process and quality. If your question is not here, ask us in the quote form."
      />

      {fallback && (
        <p role="status" className="container-x py-4 font-body text-sm text-ink/60">The latest answers could not be loaded, so this page shows the standard answers.</p>
      )}

      <section className="bg-paper py-16 lg:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          {groups && groups.length > 1 && (
            <nav aria-label="FAQ categories" className="lg:col-span-3">
              <ul className="sticky top-28 space-y-2 font-body text-sm">
                {groups.map((g) => (
                  <li key={g.value}><a href={`#faq-${g.value}`} className="block py-1.5 text-ink/70 hover:text-ink">{g.label}</a></li>
                ))}
              </ul>
            </nav>
          )}

          <div className={`space-y-14 ${groups && groups.length > 1 ? "lg:col-span-8 lg:col-start-5" : "lg:col-span-12"}`}>
            {groups === null && <div className="h-40 animate-pulse bg-bone" aria-busy="true" />}
            {groups?.map((g) => (
              <section key={g.value} id={`faq-${g.value}`} aria-labelledby={`faq-h-${g.value}`} className="scroll-mt-28">
                <h2 id={`faq-h-${g.value}`} className="font-display text-2xl font-bold">{g.label}</h2>
                <div className="mt-6 divide-y divide-line border-y border-line">
                  {g.items.map((item) => (
                    <details key={item.id} className="group py-5">
                      <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-6 font-display text-lg font-semibold">
                        {item.question}
                        <ChevronDown size={20} aria-hidden="true" className="mt-1 shrink-0 transition-transform group-open:rotate-180" />
                      </summary>
                      <p className="mt-4 max-w-3xl font-body text-base leading-relaxed text-ink/75">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
            <p className="font-body text-sm text-ink/65">
              Looking for a document? See <Link to="/resources" className="underline underline-offset-4">Resources</Link>.
            </p>
          </div>
        </div>
      </section>

      <CtaBand title="Still have a question?" text="Send the question with your drawing or specification. We reply by email." />
    </>
  );
}
