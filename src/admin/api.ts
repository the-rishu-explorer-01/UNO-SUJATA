/**
 * Administration API client. Same-origin only: the session cookie is HttpOnly, so this code never
 * sees the session. It echoes the CSRF cookie in a header on every state-changing request.
 * Server-side checks are the security boundary; this file only shapes requests and messages.
 */

export class AdminApiError extends Error {
  status: number;
  code?: string;
  fields?: Record<string, string[]>;
  constructor(status: number, message: string, code?: string, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const UNAUTHORIZED_EVENT = "uno-admin:unauthorized";

export function onUnauthorized(callback: () => void): () => void {
  window.addEventListener(UNAUTHORIZED_EVENT, callback);
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, callback);
}

function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)uno_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function readError(res: Response, path: string): Promise<AdminApiError> {
  const body = (await res.json().catch(() => null)) as { error?: string; code?: string; details?: Record<string, string[]> } | null;
  const err = new AdminApiError(
    res.status,
    body?.error ?? "Something went wrong. Please try again.",
    body?.code,
    body?.details && typeof body.details === "object" && !Array.isArray(body.details) ? body.details : undefined
  );
  // A 401 anywhere except sign-in means the session has ended: let the app return to the login screen.
  if (res.status === 401 && !path.startsWith("/auth/login")) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  return err;
}

async function request<T>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") headers["X-CSRF-Token"] = csrfToken();

  let res: Response;
  try {
    res = await fetch(`/api/admin${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new AdminApiError(0, "We could not reach the server. Check your connection and try again.", "NETWORK");
  }
  if (!res.ok) throw await readError(res, path);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EDITOR";
}

export const adminApi = {
  login: (email: string, password: string) =>
    request<{ user: AdminUser; expiresAt: string }>("POST", "/auth/login", { email, password }),
  logout: () => request<void>("POST", "/auth/logout"),
  me: () => request<{ user: AdminUser }>("GET", "/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: true }>("POST", "/auth/password", { currentPassword, newPassword }),

  dashboard: () => request<DashboardData>("GET", "/dashboard"),

  rfqs: (q: URLSearchParams) => request<Paged<RfqRow>>("GET", `/rfqs?${q}`),
  rfq: (id: string) => request<RfqDetail>("GET", `/rfqs/${id}`),
  setRfqStatus: (id: string, status: RfqStatus) => request<{ status: RfqStatus; changed: boolean }>("PATCH", `/rfqs/${id}/status`, { status }),

  products: (q: URLSearchParams) => request<Paged<ProductRow>>("GET", `/products?${q}`),
  product: (id: string) => request<ProductDetail>("GET", `/products/${id}`),
  createProduct: (body: ProductBody) => request<{ id: string; slug: string }>("POST", "/products", body),
  updateProduct: (id: string, body: ProductBody) => request<{ id: string; slug: string }>("PUT", `/products/${id}`, body),
  archiveProduct: (id: string) => request<void>("POST", `/products/${id}/archive`),
  restoreProduct: (id: string) => request<void>("POST", `/products/${id}/restore`),
  productFiles: (productId: string) => request<AdminProductFile[]>("GET", `/products/${productId}/files`),
  updateProductFile: (id: string, patch: { label?: string; isPublic?: boolean }) => request<void>("PATCH", `/product-files/${id}`, patch),
  removeProductFile: (id: string) => request<void>("DELETE", `/product-files/${id}`),
  /** Uploads one drawing, model or document with real progress. */
  uploadProductFile: (productId: string, file: File, meta: { kind: AdminProductFile["kind"]; label: string; isPublic: boolean }, onProgress: (f: number) => void) =>
    new Promise<AdminProductFile>((resolve, reject) => {
      const form = new FormData();
      form.append("kind", meta.kind);
      form.append("label", meta.label);
      form.append("isPublic", meta.isPublic ? "true" : "false");
      form.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/admin/products/${productId}/files`);
      xhr.setRequestHeader("Accept", "application/json");
      xhr.setRequestHeader("X-CSRF-Token", csrfToken());
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
        if (xhr.status === 201 && body) resolve(body as AdminProductFile);
        else {
          const b = (body ?? {}) as { error?: string; code?: string };
          if (xhr.status === 401 && !xhr.responseURL.includes("/auth/")) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
          reject(new AdminApiError(xhr.status, b.error ?? "Upload failed. Please try again.", b.code));
        }
      };
      xhr.onerror = () => reject(new AdminApiError(0, "We could not reach the server. Check your connection and try again.", "NETWORK"));
      xhr.send(form);
    }),
  productFileUrl: (id: string, inline = false) => `/api/admin/product-files/${id}/download${inline ? "?inline=1" : ""}`,
  removeImage: (productId: string, imageId: string) => request<void>("DELETE", `/products/${productId}/images/${imageId}`),
  uploadImage: async (productId: string, file: File, alt: string): Promise<{ id: string; url: string; alt: string }> => {
    const form = new FormData();
    form.append("image", file);
    form.append("alt", alt);
    let res: Response;
    try {
      res = await fetch(`/api/admin/products/${productId}/images`, {
        method: "POST",
        body: form,
        headers: { "X-CSRF-Token": csrfToken() },
        credentials: "same-origin",
      });
    } catch {
      throw new AdminApiError(0, "We could not reach the server. Check your connection and try again.", "NETWORK");
    }
    if (!res.ok) throw await readError(res, "/products/images");
    return res.json();
  },

  categories: () => request<CategoryRow[]>("GET", "/categories"),
  createCategory: (body: { name: string; summary: string }) => request<{ id: string }>("POST", "/categories", body),
  updateCategory: (id: string, body: { name: string; summary: string }) => request<void>("PUT", `/categories/${id}`, body),
  archiveCategory: (id: string) => request<void>("POST", `/categories/${id}/archive`),
  restoreCategory: (id: string) => request<void>("POST", `/categories/${id}/restore`),
  reorderCategories: (ids: string[]) => request<void>("POST", "/categories/reorder", { ids }),

  lookups: () => request<Lookups>("GET", "/lookups"),

  industries: () => request<ListItem[]>("GET", "/industries"),
  createIndustry: (body: { name: string; summary: string }) => request<{ id: string }>("POST", "/industries", body),
  updateIndustry: (id: string, body: { name: string; summary: string }) => request<void>("PUT", `/industries/${id}`, body),
  capabilities: () => request<ListItem[]>("GET", "/capabilities"),
  createCapability: (body: { title: string; description: string }) => request<{ id: string }>("POST", "/capabilities", body),
  updateCapability: (id: string, body: { title: string; description: string }) => request<void>("PUT", `/capabilities/${id}`, body),

  customers: (all = false) => request<CustomerDto[]>("GET", `/customers${all ? "?all=1" : ""}`),
  createCustomer: (body: CustomerBodyDto) => request<{ id: string }>("POST", "/customers", body),
  updateCustomer: (id: string, body: CustomerBodyDto) => request<void>("PUT", `/customers/${id}`, body),

  faqs: () => request<AdminFaq[]>("GET", "/faqs"),
  createFaq: (body: FaqBody) => request<{ id: string }>("POST", "/faqs", body),
  updateFaq: (id: string, body: FaqBody) => request<void>("PUT", `/faqs/${id}`, body),
  deleteFaq: (id: string) => request<void>("DELETE", `/faqs/${id}`),

  adminResources: () => request<AdminResource[]>("GET", "/resources"),
  createResource: (body: ResourceBody) => request<{ id: string }>("POST", "/resources", body),
  updateResource: (id: string, body: ResourceBody) => request<void>("PUT", `/resources/${id}`, body),
  deleteResource: (id: string) => request<void>("DELETE", `/resources/${id}`),
  uploadResourceFile: async (id: string, file: File): Promise<{ fileUrl: string; fileName: string; sizeBytes: number }> => {
    const form = new FormData();
    form.append("file", file);
    let res: Response;
    try {
      res = await fetch(`/api/admin/resources/${id}/file`, {
        method: "POST",
        body: form,
        headers: { "X-CSRF-Token": csrfToken() },
        credentials: "same-origin",
      });
    } catch {
      throw new AdminApiError(0, "We could not reach the server. Check your connection and try again.", "NETWORK");
    }
    if (!res.ok) throw await readError(res, "/resources/file");
    return res.json();
  },

  content: () => request<Record<string, unknown>>("GET", "/content"),
  saveContent: (key: string, value: unknown) => request<{ key: string; value: unknown }>("PUT", `/content/${key}`, { value }),

  contacts: (q: URLSearchParams) => request<Paged<ContactRow>>("GET", `/contacts?${q}`),
  markContactHandled: (id: string) => request<void>("POST", `/contacts/${id}/handled`),

  users: () => request<UserRow[]>("GET", "/users"),
  createUser: (body: { email: string; name: string; role: "ADMIN" | "EDITOR"; password: string }) => request<UserRow>("POST", "/users", body),
  updateUser: (id: string, body: { role?: "ADMIN" | "EDITOR"; active?: boolean; password?: string }) => request<UserRow>("PATCH", `/users/${id}`, body),
};

// ---- DTOs (mirror the server responses) ----

export type RfqStatus = "NEW" | "UNDER_REVIEW" | "TECHNICAL_REVIEW" | "QUOTE_PREPARED" | "CLOSED";
export const RFQ_STATUS_LABELS: Record<RfqStatus, string> = {
  NEW: "New",
  UNDER_REVIEW: "Under review",
  TECHNICAL_REVIEW: "Technical review",
  QUOTE_PREPARED: "Quote prepared",
  CLOSED: "Closed",
};

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RfqRow {
  id: string;
  rfqNumber: string;
  name: string;
  company: string;
  email: string;
  status: RfqStatus;
  createdAt: string;
  productNames: string[];
  attachmentCount: number;
}

export interface RfqDetail {
  id: string;
  rfqNumber: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  industry: string | null;
  partNumber: string | null;
  quantity: string | null;
  material: string | null;
  finish: string | null;
  application: string | null;
  deliveryRequirement: string | null;
  message: string;
  status: RfqStatus;
  createdAt: string;
  updatedAt: string;
  attachments: { id: string; originalName: string; mimeType: string; extension: string; sizeBytes: number; createdAt: string }[];
  products: { id: string; productNameSnapshot: string; productCodeSnapshot: string | null; categorySnapshot: string | null; productId: string | null }[];
  history: { id: string; action: string; summary: string; createdAt: string; actor: { name: string } | null }[];
}

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  productCode: string | null;
  productType: string;
  published: boolean;
  featured: boolean;
  verified: boolean;
  archivedAt: string | null;
  updatedAt: string;
  categoryName: string;
  imageCount: number;
}

export interface ProductBody {
  name: string;
  slug?: string;
  productCode?: string | null;
  productType: string;
  description: string;
  categoryId: string;
  materialIds: string[];
  applicationIds: string[];
  processIds: string[];
  finishes: string[];
  specifications: { label: string; value: string }[];
  verified: boolean;
  published: boolean;
  featured: boolean;
}

export interface ProductDetail extends ProductBody {
  id: string;
  archivedAt: string | null;
  images: { id: string; url: string; alt: string; sortOrder: number }[];
  materialNames: string[];
  applicationNames: string[];
  processNames: string[];
  categoryName: string;
  updatedAt: string;
}

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  summary: string;
  sortOrder: number;
  archivedAt: string | null;
  productCount: number;
}

export interface Lookups {
  materials: { id: string; name: string; slug: string }[];
  applications: { id: string; name: string; slug: string }[];
  processes: { id: string; name: string; slug: string }[];
  categories: { id: string; name: string; slug: string }[];
}

export interface ListItem {
  id: string;
  slug: string;
  name?: string;
  title?: string;
  summary?: string;
  description?: string;
  sortOrder: number;
}

export interface ContactRow {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  status: "NEW" | "HANDLED";
  createdAt: string;
  handledAt: string | null;
}

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EDITOR";
  active: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface FaqBody {
  question: string;
  answer: string;
  category: FaqCategory;
  published: boolean;
  sortOrder: number;
}

export type FaqCategory = "ORDERING" | "CUSTOM_PARTS" | "MATERIALS" | "DRAWINGS" | "RFQ_PROCESS" | "QUALITY" | "PACKAGING";
export const FAQ_CATEGORY_OPTIONS: { value: FaqCategory; label: string }[] = [
  { value: "ORDERING", label: "Ordering" },
  { value: "CUSTOM_PARTS", label: "Custom components" },
  { value: "MATERIALS", label: "Materials" },
  { value: "DRAWINGS", label: "Drawings and files" },
  { value: "RFQ_PROCESS", label: "The quote process" },
  { value: "QUALITY", label: "Quality" },
  { value: "PACKAGING", label: "Packaging and delivery" },
];

export interface AdminProductFile {
  id: string;
  kind: "DRAWING_2D" | "MODEL_3D" | "DOCUMENT";
  label: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
}

export const PRODUCT_FILE_KIND_LABEL: Record<AdminProductFile["kind"], string> = {
  DRAWING_2D: "2D drawing (PDF)",
  MODEL_3D: "3D model (GLB)",
  DOCUMENT: "Document (PDF)",
};

export interface AdminFaq extends FaqBody {
  id: string;
  updatedAt: string;
}

export type ResourceType = "CATALOGUE" | "TECHNICAL" | "BROCHURE" | "QUALITY" | "APPLICATION";
export const RESOURCE_TYPE_OPTIONS: { value: ResourceType; label: string }[] = [
  { value: "CATALOGUE", label: "Product catalogue" },
  { value: "TECHNICAL", label: "Technical document" },
  { value: "BROCHURE", label: "Brochure" },
  { value: "QUALITY", label: "Quality document" },
  { value: "APPLICATION", label: "Application information" },
];

export interface ResourceBody {
  title: string;
  type: ResourceType;
  description: string;
  sortOrder: number;
  published: boolean;
}

export interface AdminResource extends ResourceBody {
  id: string;
  slug: string;
  fileUrl: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  updatedAt: string;
}

export interface CustomerDto {
  id: string;
  name: string;
  billingAddress: string;
  shippingAddress: string | null;
  gstin: string | null;
  stateName: string;
  stateCode: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
}

export interface CustomerBodyDto {
  name: string;
  billingAddress: string;
  shippingAddress?: string;
  gstin?: string;
  stateName: string;
  stateCode: string;
  contactName?: string;
  phone?: string;
  email?: string;
  active: boolean;
}

export interface DashboardData {
  rfq: {
    newCount: number;
    openCount: number;
    thisWeek: number;
    lastWeek: number;
    byStatus: { status: RfqStatus; label: string; count: number }[];
    recent: { id: string; rfqNumber: string; company: string; status: RfqStatus; createdAt: string }[];
  };
  products: { active: number; archived: number; featured: number };
  categories: { active: number };
  contacts: { new: number };
  activity: { id: string; action: string; summary: string; entityType: string; createdAt: string; actor: { name: string } | null }[];
}
