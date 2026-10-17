import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { capabilities as fallbackCaps, industries as fallbackIndustries } from "@/data/content";
import type { Capability, Industry } from "@/types/catalog";

export default function IndustriesCapabilities() {
  const [industries, setIndustries] = useState<Industry[]>(fallbackIndustries);
  const [caps, setCaps] = useState<Capability[]>(fallbackCaps);

  useEffect(() => {
    let alive = true;
    Promise.all([api.industries(), api.capabilities()]).then(([i, c]) => {
      if (!alive) return;
      setIndustries(i);
      setCaps(c);
    });
    return () => { alive = false; };
  }, []);

  return (
    <>
      <section id="industries" className="scroll-mt-24 bg-bone py-24 lg:py-32">
        <div className="container-x">
          <p className="eyebrow">Industries served</p>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-extrabold sm:text-5xl">Where our components go</h2>
          <ul className="mt-12 divide-y divide-line border-y border-line">
            {industries.map((ind, i) => (
              <li key={ind.slug} className="grid gap-3 py-6 md:grid-cols-12 md:items-baseline md:gap-8">
                <span className="font-mono text-[11px] text-brass-deep md:col-span-1">0{i + 1}</span>
                <h3 className="font-display text-2xl font-bold md:col-span-4">{ind.name}</h3>
                <p className="font-body text-sm leading-relaxed text-ink/70 md:col-span-7">{ind.summary}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="capabilities" className="scroll-mt-24 border-t border-line bg-paper py-24 lg:py-32">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">Capabilities</p>
            <h2 className="mt-4 font-display text-4xl font-extrabold sm:text-5xl">Verify what we make</h2>
          </div>
          <ul className="grid gap-px bg-line sm:grid-cols-2 lg:col-span-8">
            {caps.map((c) => (
              <li key={c.slug} className="bg-paper p-7">
                <h3 className="font-display text-xl font-bold">{c.title}</h3>
                <p className="mt-2 font-body text-sm leading-relaxed text-ink/65">{c.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
