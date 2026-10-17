import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { adminApi, type Lookups, type Paged, type ProductRow } from "@/admin/api";
import { Badge, Button, Empty, Notice, PageHeader, Select, TextInput, errorText, formatShortDate } from "@/admin/ui";

export default function ProductListPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const state = (params.get("state") ?? "active") as "active" | "archived" | "all";
  const categoryId = params.get("category") ?? "";
  const page = Number(params.get("page") ?? 1) || 1;

  const [draft, setDraft] = useState(search);
  const [data, setData] = useState<Paged<ProductRow> | null>(null);
  const [lookups, setLookups] = useState<Lookups | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => setDraft(search), [search]);
  useEffect(() => {
    adminApi.lookups().then(setLookups).catch(() => undefined);
  }, []);

  useEffect(() => {
    const q = new URLSearchParams({ page: String(page), limit: "20", state });
    if (search) q.set("search", search);
    if (categoryId) q.set("categoryId", categoryId);
    let alive = true;
    adminApi
      .products(q)
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(errorText(e)));
    return () => {
      alive = false;
    };
  }, [search, state, categoryId, page, tick]);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in patch)) next.delete("page");
    setParams(next);
  };

  const toggleArchive = async (p: ProductRow) => {
    setNotice(null);
    try {
      if (p.archivedAt) await adminApi.restoreProduct(p.id);
      else await adminApi.archiveProduct(p.id);
      setNotice(`${p.name} ${p.archivedAt ? "restored" : "archived"}.`);
      setTick((t) => t + 1);
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="The catalogue shown on the website. Archived products are hidden from customers but kept for records."
        actions={<Link to="/admin/products/new" className="btn-primary !min-h-10 !px-4 !text-sm">New product</Link>}
      />

      <form
        role="search"
        className="grid gap-3 md:grid-cols-[1fr_200px_180px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          update({ search: draft.trim() });
        }}
      >
        <label className="relative block">
          <span className="sr-only">Search products</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/65" aria-hidden="true" />
          <TextInput type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Name, part number or URL name" className="pl-9" maxLength={100} />
        </label>
        <Select aria-label="Filter by category" value={categoryId} onChange={(e) => update({ category: e.target.value })}>
          <option value="">All categories</option>
          {lookups?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select aria-label="Filter by state" value={state} onChange={(e) => update({ state: e.target.value })}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </Select>
        <Button type="submit" variant="primary">Search</Button>
      </form>

      {error && <Notice kind="error">{error}</Notice>}
      {notice && <Notice kind="success">{notice}</Notice>}

      <div className="overflow-x-auto border border-line bg-paper">
        <table className="w-full min-w-[820px] border-collapse text-left font-body text-sm">
          <thead className="border-b border-line bg-bone font-mono text-[11px] uppercase tracking-wider text-ink/60">
            <tr>
              <th className="px-4 py-3 font-normal">Product</th>
              <th className="px-4 py-3 font-normal">Category</th>
              <th className="px-4 py-3 font-normal">Code</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Images</th>
              <th className="px-4 py-3 font-normal">Updated</th>
              <th className="px-4 py-3 text-right font-normal"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0 hover:bg-bone/60">
                <td className="px-4 py-3">
                  <Link to={`/admin/products/${p.id}`} className="font-medium hover:text-brass-deep">{p.name}</Link>
                  <span className="block font-mono text-[11px] text-ink/65">/{p.slug}</span>
                </td>
                <td className="px-4 py-3 text-ink/75">{p.categoryName}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.productCode ?? <span className="text-ink/65">None</span>}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone={p.archivedAt ? "archived" : p.published ? "live" : "draft"}>
                      {p.archivedAt ? "Archived" : p.published ? "Live" : "Draft"}
                    </Badge>
                    {p.featured && <Badge tone="NEW">Featured</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs">{p.imageCount}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink/60">{formatShortDate(p.updatedAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link to={`/admin/products/${p.id}`} className="inline-flex min-h-10 items-center px-3 font-body text-xs font-semibold uppercase tracking-wider hover:text-brass-deep">Edit</Link>
                    <Button variant="ghost" onClick={() => toggleArchive(p)} className="!min-h-10 !text-xs">
                      {p.archivedAt ? "Restore" : "Archive"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.items.length === 0 && <div className="p-6"><Empty>No products match these filters.</Empty></div>}
      </div>

      {data && data.totalPages > 1 && (
        <nav aria-label="Product pages" className="flex items-center justify-between font-body text-sm">
          <span className="text-ink/60">Page {data.page} of {data.totalPages} · {data.total} products</span>
          <div className="flex gap-2">
            <Button disabled={data.page <= 1} onClick={() => update({ page: String(data.page - 1) })}>Previous</Button>
            <Button disabled={data.page >= data.totalPages} onClick={() => update({ page: String(data.page + 1) })}>Next</Button>
          </div>
        </nav>
      )}
    </>
  );
}
