import { useEffect, useState } from "react";
import { api, type PublicContent } from "@/lib/api";

/**
 * Public CMS content, or null while loading or if the API is unavailable.
 * Pages always have verified defaults to show in that case, so nothing breaks.
 */
export function usePublicContent(): PublicContent | null {
  const [content, setContent] = useState<PublicContent | null>(null);
  useEffect(() => {
    let alive = true;
    api.publicContent().then((c) => alive && setContent(c));
    return () => {
      alive = false;
    };
  }, []);
  return content;
}
