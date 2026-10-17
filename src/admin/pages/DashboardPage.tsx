import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, RFQ_STATUS_LABELS, type DashboardData } from "@/admin/api";
import { Badge, Card, Empty, Notice, PageHeader, errorText, formatDate } from "@/admin/ui";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.dashboard().then(setData).catch((e) => setError(errorText(e)));
  }, []);

  if (error) return <Notice kind="error">{error}</Notice>;
  if (!data) return <p className="font-mono text-xs uppercase tracking-technical text-ink/65">Loading dashboard…</p>;

  const delta = data.rfq.thisWeek - data.rfq.lastWeek;
  const deltaText = delta === 0 ? "Same as the previous 7 days" : `${delta > 0 ? "+" : ""}${delta} vs the previous 7 days`;

  return (
    <>
      <PageHeader title="Dashboard" description="What needs attention today." />

      <div className="grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
        <Kpi label="New RFQs" value={data.rfq.newCount} href="/admin/rfqs?status=NEW" hint="Not yet reviewed" />
        <Kpi label="Open RFQs" value={data.rfq.openCount} href="/admin/rfqs" hint="Everything not closed" />
        <Kpi label="RFQs, last 7 days" value={data.rfq.thisWeek} href="/admin/rfqs" hint={deltaText} />
        <Kpi label="New enquiries" value={data.contacts.new} href="/admin/contacts?status=NEW" hint="Contact form, not yet handled" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="RFQs by status" className="lg:col-span-1">
          <dl className="divide-y divide-line">
            {data.rfq.byStatus.map((s) => (
              <div key={s.status} className="flex items-center justify-between py-2.5">
                <dt className="font-body text-sm">{RFQ_STATUS_LABELS[s.status]}</dt>
                <dd className="font-mono text-sm">{s.count}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card
          title="Latest RFQs"
          className="lg:col-span-2"
          actions={<Link to="/admin/rfqs" className="font-body text-xs font-semibold uppercase tracking-wider hover:text-brass-deep">All RFQs</Link>}
        >
          {data.rfq.recent.length === 0 ? (
            <Empty>No RFQs yet. They appear here as soon as a customer submits one.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.rfq.recent.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <Link to={`/admin/rfqs/${r.id}`} className="min-w-0 hover:text-brass-deep">
                    <span className="block font-mono text-xs text-ink/60">{r.rfqNumber}</span>
                    <span className="block truncate font-body text-sm font-medium">{r.company}</span>
                  </Link>
                  <div className="flex items-center gap-3">
                    <Badge tone={r.status}>{RFQ_STATUS_LABELS[r.status]}</Badge>
                    <span className="hidden font-mono text-[11px] text-ink/65 sm:inline">{formatDate(r.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Catalogue" className="lg:col-span-1">
          <dl className="space-y-3 font-body text-sm">
            <Row label="Live products" value={data.products.active} />
            <Row label="Featured" value={data.products.featured} />
            <Row label="Archived" value={data.products.archived} />
            <Row label="Active categories" value={data.categories.active} />
          </dl>
          <div className="mt-5 flex gap-4 font-body text-xs font-semibold uppercase tracking-wider">
            <Link to="/admin/products" className="hover:text-brass-deep">Products</Link>
            <Link to="/admin/categories" className="hover:text-brass-deep">Categories</Link>
          </div>
        </Card>

        <Card title="Recent activity" className="lg:col-span-2">
          {data.activity.length === 0 ? (
            <Empty>No activity recorded yet.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {data.activity.map((a) => (
                <li key={a.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-baseline sm:justify-between">
                  <span className="font-body text-sm">{a.summary}</span>
                  <span className="font-mono text-[11px] text-ink/65">
                    {a.actor?.name ?? "System"} · {formatDate(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function Kpi({ label, value, hint, href }: { label: string; value: number; hint: string; href: string }) {
  return (
    <Link to={href} className="block bg-paper p-5 transition-colors hover:bg-bone">
      <p className="font-mono text-[11px] uppercase tracking-wider text-ink/65">{label}</p>
      <p className="mt-2 font-display text-4xl font-bold">{value}</p>
      <p className="mt-2 font-body text-xs text-ink/65">{hint}</p>
    </Link>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink/70">{label}</dt>
      <dd className="font-mono">{value}</dd>
    </div>
  );
}
