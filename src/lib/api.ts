import type {
  Capability,
  FilterOption,
  Industry,
  Paged,
  ProductCategory,
  ProductDetail,
  ProductQuery,
  ProductSummary,
} from "@/types/catalog";
import { categories as seedCategories, products as seedProducts } from "@/data/products";
import { capabilities as seedCapabilities, industries as seedIndustries } from "@/data/content";
export class ApiError extends Error {
  status: number;
  /** Stable machine code from the server (e.g. VALIDATION_ERROR). Never shown to customers. */
  code?: string;
  /** Field-level validation messages, keyed by field name. */
  fields?: Record<string, string[]>;
  constructor(status: number, message: string, code?: string, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/** Reads the server's error body into an ApiError. Falls back to a generic message if the body is not JSON. */
async function toApiError(res: Response): Promise<ApiError> {
  let message = "Something went wrong. Please try again.";
  let code: string | undefined;
  let fields: Record<string, string[]> | undefined;
  try {
    const body = (await res.json()) as { error?: string; code?: string; details?: Record<string, string[]> };
    if (body.error) message = body.error;
    code = body.code;
    fields = body.details && typeof body.details === "object" && !Array.isArray(body.details) ? body.details : undefined;
  } catch {
    /* not JSON: keep the generic message */
  }
  return new ApiError(res.status, message, code, fields);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}


/**
 * In-memory cache for slow-changing lookups. Requests for the same path share one in-flight promise,
 * so a page that mounts twice does not fetch twice. Failures are not kept.
 * Search results and anything derived from a query are never passed through here.
 */
const memo = new Map<string, { at: number; value: Promise<unknown> }>();
function cachedGet<T>(path: string, ttlMs = 60_000, _signal?: AbortSignal): Promise<T> {
  // The signal is deliberately not passed to the shared request: aborting one caller must not reject
  // the promise every other caller is waiting on. Callers already ignore results after unmount.
  const hit = memo.get(path);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = request<T>(path).catch((err: unknown) => {
    memo.delete(path);
    throw err;
  });
  memo.set(path, { at: Date.now(), value });
  return value;
}

/** Builds the query string for GET /api/products. Empty values are omitted. */
export function productQueryString(q: Partial<ProductQuery>): string {
  const p = new URLSearchParams();
  if (q.search?.trim()) p.set("search", q.search.trim());
  if (q.category) p.set("category", q.category);
  q.material?.forEach((v) => p.append("material", v));
  q.application?.forEach((v) => p.append("application", v));
  q.process?.forEach((v) => p.append("process", v));
  q.type?.forEach((v) => p.append("type", v));
  if (q.page && q.page > 1) p.set("page", String(q.page));
  if (q.limit) p.set("limit", String(q.limit));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export interface SearchResults {
  query: string;
  products: { slug: string; name: string; categoryName: string; productCode: string | null }[];
  categories: { slug: string; name: string; summary: string }[];
  industries: { slug: string; name: string; summary: string }[];
  capabilities: { slug: string; title: string; description: string }[];
  resources: { slug: string; title: string; description: string; type: string }[];
  pages: { title: string; path: string }[];
}

export interface SearchSuggestions {
  categories: { slug: string; name: string }[];
  pages: { title: string; path: string }[];
}

export interface ResourceGroup {
  value: string;
  label: string;
  items: { slug: string; title: string; description: string; fileUrl: string; fileName: string | null; sizeBytes: number | null; updatedAt: string }[];
}

export interface FaqGroup {
  value: string;
  label: string;
  items: { id: string; question: string; answer: string }[];
}

/** Subset of the CMS keys the public pages read. */
export interface PublicContent {
  quality?: { title: string; intro: string; certifications: { name: string; issuer: string; reference: string; validUntil: string }[] };
  about?: { headline: string; body: string };
  contact?: { phone: string; email: string; address: string; hours: string };
}

export interface ChatCard {
  slug: string;
  name: string;
  productCode: string | null;
  categoryName: string;
  materials: string[];
  description: string;
  image: { url: string; alt: string } | null;
}

export interface ChatReply {
  reply: string;
  intent: "greeting" | "quote" | "custom" | "contact" | "capabilities" | "product";
  products: ChatCard[];
  suggestions: string[];
  aiUsed: boolean;
}

export interface PublicProductFile {
  id: string;
  kind: "DRAWING_2D" | "MODEL_3D" | "DOCUMENT";
  label: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
}

export interface StagedFile {
  id: string;
  name: string;
  extension: string;
  sizeBytes: number;
}

export interface RfqPayload {
  name: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  industry?: string;
  productSlugs: string[];
  partNumber?: string;
  quantity?: string;
  material?: string;
  finish?: string;
  application?: string;
  deliveryRequirement?: string;
  message: string;
  attachmentIds: string[];
  consent: true;
  website?: string;
}

export interface SubmitRfqResponse {
  rfqNumber: string;
  status: string;
  submittedAt: string;
}

/** Random idempotency key. Uses getRandomValues so it works on non-HTTPS origins, unlike randomUUID. */
export function newIdempotencyKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const api = {
  // Catalogue (errors surface to the UI)
  products: (q: Partial<ProductQuery>, signal?: AbortSignal) =>
    request<Paged<ProductSummary>>(`/products${productQueryString(q)}`, { signal }),
  productBySlug: (slug: string, signal?: AbortSignal) =>
    request<ProductDetail>(`/products/${encodeURIComponent(slug)}`, { signal }),
  categories: (signal?: AbortSignal) => cachedGet<ProductCategory[]>("/categories", 60_000, signal),
  materials: (signal?: AbortSignal) => cachedGet<FilterOption[]>("/materials", 300_000, signal),
  applications: (signal?: AbortSignal) => cachedGet<FilterOption[]>("/applications", 300_000, signal),
  processes: (signal?: AbortSignal) => cachedGet<FilterOption[]>("/processes", 300_000, signal),
  facets: (signal?: AbortSignal) =>
    cachedGet<{ materials: FilterOption[]; applications: FilterOption[]; processes: FilterOption[]; types: FilterOption[] }>(
      "/facets",
      60_000,
      signal
    ),

  // Global search: never cached, never stored in memory.
  search: (q: string, signal?: AbortSignal) =>
    request<SearchResults>(`/search?q=${encodeURIComponent(q)}`, { signal }),
  searchSuggestions: (signal?: AbortSignal) =>
    cachedGet<SearchSuggestions>("/search/suggestions", 300_000, signal),

  resources: (signal?: AbortSignal) => cachedGet<ResourceGroup[]>("/resources", 60_000, signal),
  faqs: (signal?: AbortSignal) => cachedGet<FaqGroup[]>("/faqs", 300_000, signal),

  // Homepage content (fallback to bundled data)
  homeCategories: () =>
    cachedGet<ProductCategory[]>("/categories", 60_000).catch(() =>
      seedCategories.map((c) => ({ ...c, productCount: seedProducts.filter((p) => p.categorySlug === c.slug).length }))
    ),
  industries: () => cachedGet<Industry[]>("/industries", 300_000).catch(() => seedIndustries),
  capabilities: () => cachedGet<Capability[]>("/capabilities", 300_000).catch(() => seedCapabilities),

  /** Uploads one drawing with real progress. Resolves with the staged file's id. */
  uploadDrawing: (file: File, onProgress: (fraction: number) => void, signal?: AbortSignal) =>
    new Promise<StagedFile>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append("file", file);
      xhr.open("POST", "/api/rfq/uploads");
      xhr.setRequestHeader("Accept", "application/json");
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(e.loaded / e.total);
      };
      xhr.onload = () => {
        let body: unknown = null;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          /* not JSON */
        }
        if (xhr.status === 201 && body) {
          resolve(body as StagedFile);
          return;
        }
        const b = (body ?? {}) as { error?: string; code?: string };
        reject(new ApiError(xhr.status, b.error ?? "Upload failed. Please try again.", b.code));
      };
      xhr.onerror = () => reject(new ApiError(0, "Network error", "NETWORK"));
      xhr.onabort = () => reject(new ApiError(0, "Upload cancelled", "CANCELLED"));
      signal?.addEventListener("abort", () => xhr.abort());
      xhr.send(form);
    }),

  discardDrawing: (id: string) => fetch(`/api/rfq/uploads/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined),

  /** Submits the enquiry. The Idempotency-Key lets a retry after a network failure return the same RFQ. */
  /** Public CMS content. Falls back to null so pages can use their own verified defaults. */
  publicContent: () => cachedGet<PublicContent | null>("/content", 60_000).catch(() => null),

  /** Business enquiry from the contact page. */
  sendContact: (payload: { name: string; email: string; company?: string; message: string; website?: string }) =>
    request<{ ok: boolean }>("/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  /** AI product assistant. The server decides whether an AI provider is used; the browser never holds a key. */
  chat: (messages: { role: "user" | "assistant"; content: string }[], signal?: AbortSignal) =>
    request<ChatReply>("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    }),

  /** Approved drawings, 3D models and documents for one product. */
  productFiles: (slug: string, signal?: AbortSignal) =>
    request<PublicProductFile[]>(`/products/${encodeURIComponent(slug)}/files`, { signal }),

  submitRfq: (payload: RfqPayload, idempotencyKey: string) =>
    request<SubmitRfqResponse>("/rfq", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(payload),
    }),
};
