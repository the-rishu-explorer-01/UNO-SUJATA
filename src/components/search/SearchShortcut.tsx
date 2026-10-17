import { useEffect } from "react";
import { openSearch } from "@/components/search/openSearch";

/** Ctrl+K or Cmd+K opens search. Ignored while typing in another field. */
export default function SearchShortcut() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
