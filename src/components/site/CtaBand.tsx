import { Link } from "react-router-dom";
import { ArrowRight, FileUp } from "lucide-react";
import Reveal from "@/components/site/Reveal";

/** The two calls to action used across the corporate pages: REQUEST A QUOTE (primary) and SEND YOUR DRAWING (secondary). */
export default function CtaBand({ title, text, subject }: { title: string; text: string; subject?: string }) {
  return (
    <section className="bg-steel py-20 text-bone lg:py-28">
      <Reveal className="container-x grid gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <h2 className="font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl">{title}</h2>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-bone/70">{text}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:col-span-5 lg:flex-col">
          <Link
            to={subject ? `/request-quote?product=${subject}` : "/request-quote"}
            className="btn-primary !bg-brass !text-ink hover:!bg-brass-light"
          >
            Request a Quote <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link to="/request-quote?type=drawing" className="btn-ghost !border-bone/30 !text-bone hover:!border-bone">
            <FileUp size={16} aria-hidden="true" /> Send Your Drawing
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
