import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { company } from "@/data/company";

export default function FinalCta() {
  return (
    <section id="contact" className="scroll-mt-24 bg-bone py-24 lg:py-32">
      <div className="container-x">
        <div className="flex flex-col gap-10 border border-ink p-8 sm:p-14 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Start a project</p>
            <h2 className="mt-4 font-display text-5xl font-extrabold leading-[1] sm:text-6xl lg:text-7xl">
              BUILD SOMETHING PRECISE.
            </h2>
            <p className="mt-6 max-w-lg font-body text-base text-ink/70">
              Tell us the part, the quantity and the application. We reply from our engineering team.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link to="/request-quote" className="btn-primary">
              Request a Quote <ArrowRight size={16} />
            </Link>
            <a href={`mailto:${company.email}`} className="btn-ghost">Talk to Engineering</a>
          </div>
        </div>
      </div>
    </section>
  );
}
