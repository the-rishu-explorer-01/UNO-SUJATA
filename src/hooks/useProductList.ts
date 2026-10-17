import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Paged, ProductQuery, ProductSummary } from "@/types/catalog";

export type ListState =
  | { status: "loading"; data: Paged<ProductSummary> | null; error: null }
  | { status: "success"; data: Paged<ProductSummary>; error: null }
  | { status: "error"; data: Paged<ProductSummary> | null; error: string };

/**
 * Fetches the product list for a query. Each new query cancels the in-flight request,
 * so stale responses never overwrite newer results.
 */
export function useProductList(query: ProductQuery) {
  const key = JSON.stringify(query);
  const [state, setState] = useState<ListState>({ status: "loading", data: null, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ status: "loading", data: prev.data, error: null }));
    api
      .products(JSON.parse(key) as ProductQuery, controller.signal)
      .then((data) => setState({ status: "success", data, error: null }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Could not load products";
        setState((prev) => ({ status: "error", data: prev.data, error: message }));
      });
    return () => controller.abort();
    // `key` is the stable serialisation of `query`; `attempt` triggers a manual retry.
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
