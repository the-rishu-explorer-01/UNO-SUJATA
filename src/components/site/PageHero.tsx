import type { ReactNode } from "react";
import Reveal from "@/components/site/Reveal";

/** Common hero for inner pages: editorial headline on the technical grid, with an optional drawing on the right. */
export default function PageHero({
  eyebrow,
  title,
  lead,
  actions,
  visual,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  actions?: ReactNode;
  visual?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-bone">
      <div className="tech-grid absolute inset-0 opacity-60" aria-hidden="true" />
      <div className={`container-x relative grid gap-12 pb-16 pt-14 lg:pb-24 lg:pt-20 ${visual ? "lg:grid-cols-12" : ""}`}>
        <Reveal className={visual ? "lg:col-span-7" : "max-w-4xl"}>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-5 font-display text-[40px] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">{title}</h1>
          {lead && <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-ink/75">{lead}</p>}
          {actions && <div className="mt-10 flex flex-col gap-3 sm:flex-row">{actions}</div>}
        </Reveal>
        {visual && (
          <Reveal delay={0.1} className="lg:col-span-5">
            {visual}
          </Reveal>
        )}
      </div>
    </section>
  );
}
