import { useEffect, useState } from "react";
import { api, ApiError, type SearchResults } from "@/lib/api";

export type SearchState =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: SearchResults | null; error: null }
  | { status: "ready"; data: SearchResults; error: null }
  | { status: "error"; data: SearchResults | null; error: string };

/**
 * Runs a search for a query that the caller has already debounced.
 * Each new query aborts the previous request, so slow responses cannot overwrite newer ones.
 * Results are held in component state only, and are not persisted anywhere.
 */
export function useSearch(query: string, attempt = 0): SearchState {
  const q = query.trim();
  const [state, setState] = useState<SearchState>({ status: "idle", data: null, error: null });

  useEffect(() => {
    if (q.length < 2) {
      setState({ status: "idle", data: null, error: null });
      return;
    }
    const controller = new AbortController();
    setState((prev) => ({ status: "loading", data: prev.data, error: null }));
    api
      .search(q, controller.signal)
      .then((data) => setState({ status: "ready", data, error: null }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          err instanceof ApiError && err.status === 429
            ? err.message
            : "Search is unavailable right now. Try again in a moment.";
        setState((prev) => ({ status: "error", data: prev.data, error: message }));
      });
    return () => controller.abort();
  }, [q, attempt]);

  return state;
}
