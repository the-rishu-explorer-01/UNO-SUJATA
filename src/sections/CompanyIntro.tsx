import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { company } from "@/data/company";

export default function CompanyIntro() {
  return (
    <section id="about" className="scroll-mt-24 bg-paper py-24 lg:py-32">
      <div className="container-x grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className="eyebrow">About UNO SUJATA</p>
          <h2 className="mt-5 font-display text-5xl font-extrabold leading-[1.02] sm:text-6xl">
            Built on brass.
            <span className="block text-brass-deep">Driven by precision.</span>
          </h2>
        </div>
        <div className="space-y-6 font-body text-base leading-relaxed text-ink/75 lg:col-span-5 lg:col-start-8">
          <p>
            Sujata began in 1978 in a small workshop and grew into a manufacturing group in
            Jamnagar, Gujarat, with about 100,000 sq. ft. of facility and a workforce of around 120.
          </p>
          <p>
            It is a family company that has grown into a manufacturer of brass electrical parts,
            pins, terminals, gas parts, automotive components and fasteners for OEMs and buyers
            around the world.
          </p>
          <div className="rule pt-6">
            <Link to="/about" className="inline-flex items-center gap-2 font-body text-sm font-semibold uppercase tracking-wider text-ink hover:text-brass-deep">
              Explore {company.brand} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
