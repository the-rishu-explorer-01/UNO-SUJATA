import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const inputs = ["Drawing", "Sample", "Specification", "Application requirement"];

export default function CustomBuild() {
  return (
    <section className="bg-steel py-24 text-bone lg:py-32">
      <div className="container-x grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="eyebrow !text-brass-light">Custom manufacturing</p>
          <h2 className="mt-5 font-display text-5xl font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
            HAVE A DRAWING?
            <span className="block text-brass-light">LET&apos;S BUILD IT.</span>
          </h2>
          <p className="mt-8 max-w-xl font-body text-lg leading-relaxed text-bone/70">
            Send us what you have. Our engineers review it and come back with feasibility, material
            and a quote. You do not need a finished part design to start.
          </p>
          <Link to="/request-quote?type=drawing" className="btn-primary mt-10 !bg-brass !text-ink hover:!bg-brass-light">
            Send Your Drawing <ArrowRight size={16} />
          </Link>
        </div>

        <ul className="grid grid-cols-1 gap-px bg-graphite sm:grid-cols-2 lg:col-span-5">
          {inputs.map((item, i) => (
            <li key={item} className="flex min-h-[140px] flex-col justify-between bg-steel p-7">
              <span className="font-mono text-[11px] text-brass-light">0{i + 1}</span>
              <span className="font-display text-2xl font-bold">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
