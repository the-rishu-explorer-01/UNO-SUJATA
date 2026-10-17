export interface ProductCategory {
  slug: string;
  name: string;
  summary: string;
  productCount?: number;
}

/** A filter option (material, application, process) with its product count. */
export interface FilterOption {
  slug: string;
  name: string;
  count?: number;
}

export interface Industry {
  slug: string;
  name: string;
  summary: string;
}

export interface Capability {
  slug: string;
  title: string;
  description: string;
}

export interface CompanyFact {
  value: string;
  label: string;
}

export interface ProductImage {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

/** Shape returned by GET /api/products (list items). */
export interface ProductSummary {
  slug: string;
  name: string;
  productCode: string | null;
  productType: string;
  description: string;
  categorySlug: string;
  categoryName: string;
  materials: string[];
  applications: string[];
  processes: string[];
  image: ProductImage | null;
}

/** Shape returned by GET /api/products/:slug. */
export interface ProductDetail extends ProductSummary {
  finishes: string[];
  /** Specifications entered by staff in the admin. Shown after the standard rows. */
  specifications: { label: string; value: string }[];
  verified: boolean;
  images: ProductImage[];
  related: ProductSummary[];
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductQuery {
  search: string;
  category: string;
  material: string[];
  application: string[];
  process: string[];
  type: string[];
  page: number;
  limit: number;
}
