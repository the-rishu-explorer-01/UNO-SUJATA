import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import FilterPanel, { type FacetKey } from "@/components/catalog/FilterPanel";
import type { FilterOption, ProductCategory, ProductQuery } from "@/types/catalog";

interface Props {
  open: boolean;
  onClose: () => void;
  resultCount: number | null;
  query: ProductQuery;
  categories: ProductCategory[];
  facets: { materials: FilterOption[]; applications: FilterOption[]; processes: FilterOption[]; types: FilterOption[] } | null;
  facetsError?: boolean;
  onCategory: (slug: string) => void;
  onToggle: (key: FacetKey, slug: string) => void;
  onClearAll: () => void;
}

/** Mobile filter drawer. Closes on Escape and returns focus to the trigger. */
export default function FilterDrawer(props: Props) {
  const { open, onClose, resultCount } = props;
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-40 bg-ink/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label="Product filters"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col bg-paper"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex h-16 items-center justify-between border-b border-line px-5">
              <p className="font-display text-lg font-bold">Filter products</p>
              <button ref={closeRef} type="button" aria-label="Close filters" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center">
                <X size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <FilterPanel
                query={props.query}
                categories={props.categories}
                facets={props.facets}
                facetsError={props.facetsError}
                onCategory={props.onCategory}
                onToggle={props.onToggle}
                onClearAll={props.onClearAll}
              />
            </div>
            <div className="border-t border-line p-5">
              <button type="button" onClick={onClose} className="btn-primary w-full">
                {resultCount === null ? "Show results" : `Show ${resultCount} result${resultCount === 1 ? "" : "s"}`}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
