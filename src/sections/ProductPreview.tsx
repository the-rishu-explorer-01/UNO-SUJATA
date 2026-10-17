import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import type { ProductCategory } from "@/types/catalog";

export default function ProductPreview() {
  const [cats, setCats] = useState<ProductCategory[]>([]);

  useEffect(() => {
    let alive = true;
    api.homeCategories().then((c) => alive && setCats(c));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section id="products" className="scroll-mt-24 bg-bone py-24 lg:py-32">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-6 border-b border-ink pb-8 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">Product range</p>
            <h2 className="mt-4 font-display text-4xl font-extrabold sm:text-5xl">Components across ten categories</h2>
          </div>
          <Link to="/products" className="btn-ghost self-start md:self-auto">Explore Products</Link>
        </div>

        <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c, i) => (
            <li key={c.slug} className="bg-paper">
              <Link to={`/products/category/${c.slug}`} className="group flex h-full flex-col justify-between p-7 transition-colors hover:bg-bone">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-[11px] text-brass-deep">{String(i + 1).padStart(2, "0")}</span>
                  <ArrowUpRight size={18} className="text-ink/65 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink" />
                </div>
                <div className="mt-12">
                  <h3 className="font-display text-2xl font-bold">{c.name}</h3>
                  <p className="mt-2 font-body text-sm leading-relaxed text-ink/65">{c.summary}</p>
                  <p className="mt-4 font-mono text-[11px] uppercase tracking-technical text-ink/65">
                    {c.productCount ?? 0} product line{c.productCount === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
