import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { adminApi, RFQ_STATUS_LABELS, type Paged, type RfqRow, type RfqStatus } from "@/admin/api";
import { Badge, Button, Empty, Notice, PageHeader, Select, TextInput, errorText, formatDate } from "@/admin/ui";

const STATUSES = Object.keys(RFQ_STATUS_LABELS) as RfqStatus[];

export default function RfqListPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const status = (params.get("status") ?? "") as RfqStatus | "";
  const page = Number(params.get("page") ?? 1) || 1;

  const [draft, setDraft] = useState(search);
  const [data, setData] = useState<Paged<RfqRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep the search box in step with the URL (back button, shared links).
  useEffect(() => setDraft(search), [search]);

  useEffect(() => {
    const q = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) q.set("search", search);
    if (status) q.set("status", status);
    let alive = true;
    setLoading(true);
    adminApi
      .rfqs(q)
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e) => alive && setError(errorText(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [search, status, page]);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in patch)) next.delete("page");
    setParams(next);
  };

  return (
    <>
      <PageHeader title="RFQs" description="Requests for quotation from the website, newest first." />

      <form
        role="search"
        className="grid gap-3 sm:grid-cols-[1fr_200px_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          update({ search: draft.trim() });
        }}
      >
        <label className="relative block">
          <span className="sr-only">Search RFQs</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/65" aria-hidden="true" />
          <TextInput type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="RFQ number, company, name or email" className="pl-9" maxLength={100} />
        </label>
        <label className="block">
          <span className="sr-only">Filter by status</span>
          <Select value={status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{RFQ_STATUS_LABELS[s]}</option>)}
          </Select>
        </label>
        <Button type="submit" variant="primary">Search</Button>
      </form>

      {error && <Notice kind="error">{error}</Notice>}

      <div className="overflow-x-auto border border-line bg-paper">
        <table className="w-full min-w-[760px] border-collapse text-left font-body text-sm">
          <thead className="border-b border-line bg-bone font-mono text-[11px] uppercase tracking-wider text-ink/60">
            <tr>
              <th className="px-4 py-3 font-normal">RFQ</th>
              <th className="px-4 py-3 font-normal">Company</th>
              <th className="px-4 py-3 font-normal">Products</th>
              <th className="px-4 py-3 font-normal">Files</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Received</th>
            </tr>
          </thead>
          <tbody className={loading ? "opacity-60" : ""}>
            {data?.items.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0 hover:bg-bone/60">
                <td className="px-4 py-3">
                  <Link to={`/admin/rfqs/${r.id}`} className="font-mono text-xs font-medium hover:text-brass-deep">{r.rfqNumber}</Link>
                </td>
                <td className="px-4 py-3">
                  <span className="block font-medium">{r.company}</span>
                  <span className="block text-xs text-ink/60">{r.name}</span>
                </td>
                <td className="max-w-[260px] truncate px-4 py-3 text-ink/75">{r.productNames.join(", ") || "Not specified"}</td>
                <td className="px-4 py-3 font-mono text-xs">{r.attachmentCount}</td>
                <td className="px-4 py-3"><Badge tone={r.status}>{RFQ_STATUS_LABELS[r.status]}</Badge></td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-ink/60">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.items.length === 0 && !loading && (
          <div className="p-6"><Empty>No RFQs match these filters.</Empty></div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <nav aria-label="RFQ pages" className="flex items-center justify-between font-body text-sm">
          <span className="text-ink/60">Page {data.page} of {data.totalPages} · {data.total} total</span>
          <div className="flex gap-2">
            <Button disabled={data.page <= 1} onClick={() => update({ page: String(data.page - 1) })}>Previous</Button>
            <Button disabled={data.page >= data.totalPages} onClick={() => update({ page: String(data.page + 1) })}>Next</Button>
          </div>
        </nav>
      )}
    </>
  );
}
