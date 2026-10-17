import { journeySteps, qualityChecks } from "@/data/content";

export function ManufacturingJourney() {
  return (
    <section className="bg-bone py-24 lg:py-32">
      <div className="container-x">
        <p className="eyebrow">Manufacturing journey</p>
        <h2 className="mt-4 max-w-2xl font-display text-4xl font-extrabold sm:text-5xl">From requirement to dispatch</h2>

        <ol className="relative mt-16 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {journeySteps.map((s) => (
            <li key={s.no} className="relative border-t border-ink pt-6">
              <span className="absolute -top-[5px] left-0 h-2.5 w-2.5 bg-brass" aria-hidden="true" />
              <span className="font-mono text-[11px] text-brass-deep">{s.no}</span>
              <h3 className="mt-3 font-display text-xl font-bold">{s.title}</h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-ink/65">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function QualityPreview() {
  return (
    <section id="quality" className="scroll-mt-24 border-y border-line bg-steel py-24 text-bone lg:py-32">
      <div className="container-x grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <p className="eyebrow !text-brass-light">Quality</p>
          <h2 className="mt-4 font-display text-4xl font-extrabold sm:text-5xl">Inspected to print</h2>
          <p className="mt-6 font-body text-base leading-relaxed text-bone/70">
            Each product is manufactured to match its drawing. Inspection runs from incoming material
            through to dispatch.
          </p>
        </div>
        <ul className="grid gap-px bg-graphite sm:grid-cols-2 lg:col-span-8">
          {qualityChecks.map((q, i) => (
            <li key={q.title} className="bg-steel p-7">
              <span className="font-mono text-[11px] text-brass-light">Q{i + 1}</span>
              <h3 className="mt-3 font-display text-xl font-bold">{q.title}</h3>
              <p className="mt-2 font-body text-sm leading-relaxed text-bone/65">{q.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
