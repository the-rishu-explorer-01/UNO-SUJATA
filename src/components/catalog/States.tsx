import { Link } from "react-router-dom";
import { AlertTriangle, SearchX } from "lucide-react";

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-paper p-6">
          <div className="aspect-[4/3] w-full animate-pulse bg-bone" />
          <div className="mt-5 h-3 w-1/3 animate-pulse bg-bone" />
          <div className="mt-3 h-5 w-3/4 animate-pulse bg-bone" />
          <div className="mt-3 h-3 w-full animate-pulse bg-bone" />
          <div className="mt-2 h-3 w-5/6 animate-pulse bg-bone" />
        </div>
      ))}
    </div>
  );
}

export function EmptyResults({ onClear, hasFilters }: { onClear: () => void; hasFilters: boolean }) {
  return (
    <div role="status" className="flex flex-col items-center border border-dashed border-ink/30 px-6 py-20 text-center">
      <SearchX size={36} className="text-ink/65" aria-hidden="true" />
      <h3 className="mt-5 font-display text-2xl font-bold">No products match this search.</h3>
      <p className="mt-3 max-w-md font-body text-sm text-ink/65">
        Try a shorter term, a different material, or a broader category. You can also send your drawing, and we will check whether we can make it.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {hasFilters && (
          <button type="button" onClick={onClear} className="btn-ghost">Clear filters</button>
        )}
        <Link to="/request-quote?type=drawing" className="btn-primary">Send Your Drawing</Link>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center border border-red-900/30 bg-paper px-6 py-16 text-center">
      <AlertTriangle size={36} className="text-red-800" aria-hidden="true" />
      <h3 className="mt-5 font-display text-2xl font-bold">Products could not be loaded.</h3>
      <p className="mt-3 max-w-md font-body text-sm text-ink/65">{message}. Check your connection and try again.</p>
      <button type="button" onClick={onRetry} className="btn-primary mt-8">Try again</button>
    </div>
  );
}
