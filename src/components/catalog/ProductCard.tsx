import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import ProductImage from "@/components/catalog/ProductImage";
import type { ProductSummary } from "@/types/catalog";

export default function ProductCard({ product, eager = false }: { product: ProductSummary; eager?: boolean }) {
  const list = (items: string[]) => (items.length ? items.join(", ") : "Available on request");

  return (
    <article className="group flex h-full flex-col bg-paper transition-[background-color,box-shadow] duration-300 hover:z-10 hover:bg-bone hover:shadow-[0_14px_30px_-18px_rgba(14,15,17,0.45)]">
      <Link to={`/products/${product.slug}`} className="block overflow-hidden" aria-label={`View ${product.name}`}>
        <ProductImage image={product.image} eager={eager} className="transition-transform duration-500 group-hover:scale-[1.02]" />
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-4">
          <p className="eyebrow !text-[10px]">{product.categoryName}</p>
          {product.productCode && <span className="font-mono text-[11px] text-ink/65">{product.productCode}</span>}
        </div>

        <h3 className="mt-3 font-display text-xl font-bold leading-tight">
          <Link to={`/products/${product.slug}`} className="hover:text-brass-deep">{product.name}</Link>
        </h3>

        <p className="mt-2 line-clamp-2 font-body text-sm leading-relaxed text-ink/65">{product.description}</p>

        <dl className="mt-5 grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 border-t border-line pt-4 font-body text-xs">
          <dt className="font-mono uppercase tracking-technical text-ink/65">Material</dt>
          <dd className="text-ink/80">{list(product.materials)}</dd>
          <dt className="font-mono uppercase tracking-technical text-ink/65">Application</dt>
          <dd className="text-ink/80">{list(product.applications)}</dd>
        </dl>

        <div className="mt-6 flex flex-wrap gap-3 pt-2">
          <Link to={`/products/${product.slug}`} className="btn-primary !px-4 !py-2.5 !text-xs">
            View Product <ArrowUpRight size={14} />
          </Link>
          <Link to={`/request-quote?product=${encodeURIComponent(product.slug)}`} className="btn-ghost !px-4 !py-2.5 !text-xs">
            Request Quote
          </Link>
        </div>
      </div>
    </article>
  );
}
