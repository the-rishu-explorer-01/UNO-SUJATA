import { useEffect } from "react";

const SITE = "https://www.unosujata.com";
const JSONLD_ID = "page-jsonld";

interface SeoProps {
  title: string;
  description: string;
  /** Path only, e.g. "/products/fuel-jets". Used for canonical and og:url. */
  path: string;
  image?: string;
  type?: "website" | "product";
  /** Optional structured data for this page (Product, BreadcrumbList, etc.). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Set false to keep the page out of search results (e.g. not-found pages). */
  indexable?: boolean;
}

/** Sets per-page title, description, canonical, Open Graph, robots and JSON-LD. Cleans up on route change. */
export default function Seo({ title, description, path, image, type = "website", jsonLd, indexable = true }: SeoProps) {
  useEffect(() => {
    const url = `${SITE}${path}`;
    document.title = title;

    setMeta("name", "description", description);
    setMeta("name", "robots", indexable ? "index, follow" : "noindex, nofollow");
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", type);
    setMeta("property", "og:url", url);
    setMeta("property", "og:site_name", "UNO SUJATA");
    if (image) setMeta("property", "og:image", image);

    // Twitter/X reads its own tags; without them a shared link shows a plain URL.
    setMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    if (image) setMeta("name", "twitter:image", image);

    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = url;

    let script = document.getElementById(JSONLD_ID) as HTMLScriptElement | null;
    if (jsonLd) {
      if (!script) {
        script = document.createElement("script");
        script.type = "application/ld+json";
        script.id = JSONLD_ID;
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd);
    } else if (script) {
      script.remove();
    }

    return () => {
      document.getElementById(JSONLD_ID)?.remove();
    };
  }, [title, description, path, image, type, indexable, jsonLd]);

  return null;
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}
