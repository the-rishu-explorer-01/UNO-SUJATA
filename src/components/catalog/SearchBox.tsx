import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

interface Props {
  value: string;
  onCommit: (next: string) => void;
  /** Shown while a search request is in flight. */
  loading?: boolean;
}

/**
 * Debounced search input. Typing updates the URL 300 ms after the user stops.
 * Enter commits immediately. The input keeps its own text so typing never lags.
 */
export default function SearchBox({ value, onCommit, loading = false }: Props) {
  const [text, setText] = useState(value);
  const debounced = useDebouncedValue(text, 300);
  const committed = useRef(value);

  // Keep local text in sync when the URL changes from outside (back button, chips).
  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      setText(value);
    }
  }, [value]);

  // Push debounced text up to the URL.
  useEffect(() => {
    if (debounced.trim() !== committed.current.trim()) {
      committed.current = debounced.trim();
      onCommit(debounced.trim());
    }
  }, [debounced, onCommit]);

  const submit = () => {
    committed.current = text.trim();
    onCommit(text.trim());
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="relative"
    >
      <label htmlFor="product-search" className="sr-only">
        Search products by name, part number, material, application or process
      </label>
      <Search size={20} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/65" aria-hidden="true" />
      <input
        id="product-search"
        type="search"
        autoComplete="off"
        placeholder="Search name, part number, material, application…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="h-14 w-full border border-ink bg-paper pl-12 pr-24 font-body text-base placeholder:text-ink/65 focus:outline-none focus:ring-2 focus:ring-brass"
      />
      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {loading && <span className="font-mono text-[10px] uppercase tracking-technical text-ink/65">Searching</span>}
        {text && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setText("");
              committed.current = "";
              onCommit("");
            }}
            className="inline-flex h-10 w-10 items-center justify-center text-ink/60 hover:text-ink"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </form>
  );
}
