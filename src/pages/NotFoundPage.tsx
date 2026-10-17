import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import Seo from "@/components/Seo";
import Reveal from "@/components/site/Reveal";

/** Premium 404. Uses the brand's own language and offers the two most useful next steps. */
export default function NotFoundPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term.slice(0, 100))}` : "/products");
  };

  return (
    <>
      <Seo title="Page not found | UNO SUJATA" description="This page does not exist. Return home, explore products or search the site." path="/404" indexable={false} />
      <section className="relative overflow-hidden bg-bone">
        <div className="tech-grid absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="container-x relative grid min-h-[70vh] items-center gap-14 py-20 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <p className="eyebrow">Error 404</p>
            <h1 className="mt-5 font-display text-[44px] font-extrabold uppercase leading-[0.98] sm:text-6xl lg:text-7xl">
              This component doesn&apos;t exist.
            </h1>
            <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-ink/70">
              The link may be out of date, or the page may have moved. Try one of these, or search for what you need.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link to="/" className="btn-primary">Return Home</Link>
              <Link to="/products" className="btn-ghost">Explore Products</Link>
            </div>
            <form onSubmit={submit} role="search" className="mt-12 max-w-md">
              <label htmlFor="notfound-search" className="block font-mono text-[11px] uppercase tracking-technical text-ink/60">Or search</label>
              <div className="mt-2 flex">
                <input
                  id="notfound-search"
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value.slice(0, 100))}
                  maxLength={100}
                  placeholder="Part, industry or document"
                  className="min-h-11 flex-1 border border-ink bg-paper px-3 font-body text-sm focus:outline-none focus:ring-2 focus:ring-brass"
                />
                <button type="submit" aria-label="Search" className="inline-flex min-h-11 w-11 items-center justify-center bg-ink text-bone hover:bg-brass-deep">
                  <Search size={18} aria-hidden="true" />
                </button>
              </div>
            </form>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-5">
            <svg viewBox="0 0 420 320" className="h-auto w-full" aria-hidden="true">
              <g stroke="#0E0F11" fill="none" strokeWidth="1">
                <circle cx="210" cy="160" r="110" strokeDasharray="6 6" />
                <circle cx="210" cy="160" r="60" />
                <circle cx="210" cy="160" r="24" stroke="#A9834A" strokeWidth="2" />
                <line x1="40" y1="160" x2="380" y2="160" strokeOpacity="0.3" strokeDasharray="3 5" />
                <line x1="210" y1="30" x2="210" y2="290" strokeOpacity="0.3" strokeDasharray="3 5" />
              </g>
              <g fontFamily="JetBrains Mono, monospace" fontSize="12" fill="#7D5F33">
                <text x="222" y="106">Ø ???</text>
                <text x="20" y="312">REF: NOT FOUND</text>
              </g>
            </svg>
          </Reveal>
        </div>
      </section>
    </>
  );
}
