import { company, trustFacts } from "@/data/company";

export default function TrustBar() {
  return (
    <section aria-label="Company facts" className="bg-steel text-bone">
      <div className="container-x grid grid-cols-2 lg:grid-cols-4">
        {trustFacts.map((f, i) => (
          <div
            key={f.label}
            className={`py-10 pr-4 ${i % 2 === 0 ? "" : "border-l border-graphite pl-6"} lg:border-l lg:border-graphite lg:pl-8 ${i === 0 ? "lg:border-l-0 lg:pl-0" : ""}`}
          >
            <p className="font-display text-4xl font-bold text-brass-light sm:text-5xl">{f.value}</p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-technical text-bone/60">{f.label}</p>
          </div>
        ))}
      </div>
      <p className="container-x pb-8 font-mono text-[11px] text-bone/65">
        Source: company website. {company.exporterClaim}
      </p>
    </section>
  );
}
