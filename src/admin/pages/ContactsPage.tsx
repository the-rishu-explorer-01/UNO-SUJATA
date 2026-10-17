import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminApi, type ContactRow, type Paged } from "@/admin/api";
import { Badge, Button, Empty, Notice, PageHeader, Select, errorText, formatDate } from "@/admin/ui";

export default function ContactsPage() {
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") ?? "") as "" | "NEW" | "HANDLED";
  const page = Number(params.get("page") ?? 1) || 1;
  const [data, setData] = useState<Paged<ContactRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const q = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) q.set("status", status);
    let alive = true;
    adminApi.contacts(q).then((d) => alive && setData(d)).catch((e) => alive && setError(errorText(e)));
    return () => {
      alive = false;
    };
  }, [status, page, tick]);

  const handle = async (id: string) => {
    try {
      await adminApi.markContactHandled(id);
      setTick((t) => t + 1);
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <>
      <PageHeader title="Contact enquiries" description="Messages from the website contact form." />
      <Select aria-label="Filter by status" className="max-w-xs" value={status} onChange={(e) => {
        const next = new URLSearchParams(params);
        if (e.target.value) next.set("status", e.target.value);
        else next.delete("status");
        next.delete("page");
        setParams(next);
      }}>
        <option value="">All</option>
        <option value="NEW">New</option>
        <option value="HANDLED">Handled</option>
      </Select>
      {error && <Notice kind="error">{error}</Notice>}
      {data && data.items.length === 0 && <Empty>No enquiries here.</Empty>}
      <ul className="space-y-4">
        {data?.items.map((c) => (
          <li key={c.id} className="border border-line bg-paper p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-display text-base font-bold">{c.name} <span className="font-body text-sm font-normal text-ink/60">· {c.company ?? "No company given"}</span></p>
                <a href={`mailto:${c.email}`} className="font-body text-sm hover:text-brass-deep">{c.email}</a>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={c.status === "NEW" ? "NEW_CONTACT" : "HANDLED"}>{c.status === "NEW" ? "New" : "Handled"}</Badge>
                <span className="font-mono text-[11px] text-ink/65">{formatDate(c.createdAt)}</span>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-wrap font-body text-sm leading-relaxed">{c.message}</p>
            {c.status === "NEW" && (
              <div className="mt-4"><Button onClick={() => handle(c.id)}>Mark as handled</Button></div>
            )}
          </li>
        ))}
      </ul>
      {data && data.totalPages > 1 && (
        <nav aria-label="Enquiry pages" className="flex items-center justify-between font-body text-sm">
          <span className="text-ink/60">Page {data.page} of {data.totalPages}</span>
          <div className="flex gap-2">
            <Button disabled={data.page <= 1} onClick={() => { const n = new URLSearchParams(params); n.set("page", String(data.page - 1)); setParams(n); }}>Previous</Button>
            <Button disabled={data.page >= data.totalPages} onClick={() => { const n = new URLSearchParams(params); n.set("page", String(data.page + 1)); setParams(n); }}>Next</Button>
          </div>
        </nav>
      )}
    </>
  );
}
