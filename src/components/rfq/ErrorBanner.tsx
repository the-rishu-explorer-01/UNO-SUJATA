import { AlertTriangle, RotateCw, WifiOff } from "lucide-react";
import type { DescribedError } from "@/lib/rfqErrors";

interface Props {
  error: DescribedError;
  onRetry?: () => void;
}

/** Customer-facing error. Never shows stack traces or raw server errors. */
export default function ErrorBanner({ error, onRetry }: Props) {
  const Icon = error.kind === "network" ? WifiOff : AlertTriangle;
  return (
    <div role="alert" className="flex gap-4 border border-red-900/40 bg-red-50/60 p-5">
      <Icon size={22} className="mt-0.5 shrink-0 text-red-800" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-display text-base font-bold text-red-900">{error.title}</p>
        <p className="mt-1 font-body text-sm leading-relaxed text-red-900/80">{error.message}</p>
        {error.retryable && onRetry && (
          <button type="button" onClick={onRetry} className="mt-3 inline-flex items-center gap-2 font-body text-sm font-semibold text-red-900 underline underline-offset-4">
            <RotateCw size={14} aria-hidden="true" /> Try again
          </button>
        )}
      </div>
    </div>
  );
}
