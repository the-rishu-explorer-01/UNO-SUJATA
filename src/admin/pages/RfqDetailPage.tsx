import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, Mail, Phone } from "lucide-react";
import { adminApi, RFQ_STATUS_LABELS, type RfqDetail, type RfqStatus } from "@/admin/api";
import { useAdminAuth } from "@/admin/AdminAuth";
import { Badge, Button, Card, Notice, PageHeader, Select, errorText, formatDate, formatShortDate } from "@/admin/ui";

const STATUSES = Object.keys(RFQ_STATUS_LABELS) as RfqStatus[];

export default function RfqDetailPage() {
  const { id = "" } = useParams();
  const { state } = useAdminAuth();
  const canDownload = state.status === "authenticated";
  const [rfq, setRfq] = useState<RfqDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<RfqStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    adminApi
      .rfq(id)
      .then((d) => {
        setRfq(d);
        setStatus(d.status);
      })
      .catch((e) => setError(errorText(e)));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const saveStatus = async () => {
    if (!rfq || !status || status === rfq.status) return;
    setSaving(true);
    setMessage(null);
    try {
      await adminApi.setRfqStatus(rfq.id, status);
      setMessage(`Status updated to ${RFQ_STATUS_LABELS[status]}.`);
      load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  if (error && !rfq) return <Notice kind="error">{error}</Notice>;
  if (!rfq) return <p className="font-mono text-xs uppercase tracking-technical text-ink/65">Loading RFQ…</p>;

  return (
    <>
      <PageHeader
        title={rfq.rfqNumber}
        description={`Received ${formatDate(rfq.createdAt)} from ${rfq.company}`}
        actions={<Link to="/admin/rfqs" className="font-body text-sm font-semibold uppercase tracking-wider hover:text-brass-deep">← All RFQs</Link>}
      />

      {error && <Notice kind="error">{error}</Notice>}
      {message && <Notice kind="success">{message}</Notice>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Requirement">
            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Detail label="Products">
                {rfq.products.length === 0 ? "Not specified" : (
                  <ul className="space-y-1">
                    {rfq.products.map((p) => (
                      <li key={p.id}>
                        {p.productId ? (
                          <Link to={`/admin/products/${p.productId}`} className="hover:text-brass-deep">{p.productNameSnapshot}</Link>
                        ) : (
                          p.productNameSnapshot
                        )}
                        {p.productCodeSnapshot && <span className="ml-2 font-mono text-xs text-ink/65">{p.productCodeSnapshot}</span>}
                        {p.categorySnapshot && <span className="block text-xs text-ink/65">{p.categorySnapshot}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </Detail>
              <Detail label="Part number">{rfq.partNumber}</Detail>
              <Detail label="Quantity">{rfq.quantity}</Detail>
              <Detail label="Material">{rfq.material}</Detail>
              <Detail label="Required finish">{rfq.finish}</Detail>
              <Detail label="Application">{rfq.application}</Detail>
              <Detail label="Target delivery">{rfq.deliveryRequirement}</Detail>
              <Detail label="Industry">{rfq.industry}</Detail>
            </dl>
            <div className="mt-6 border-t border-line pt-6">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink/65">Additional requirements</p>
              <p className="mt-2 whitespace-pre-wrap font-body text-sm leading-relaxed">{rfq.message}</p>
            </div>
          </Card>

          <Card title={`Drawings and files (${rfq.attachments.length})`}>
            {rfq.attachments.length === 0 ? (
              <p className="font-body text-sm text-ink/60">No files were attached.</p>
            ) : (
              <ul className="divide-y divide-line">
                {rfq.attachments.map((a) => (
                  <li key={a.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-body text-sm font-medium">{a.originalName}</p>
                      <p className="font-mono text-[11px] text-ink/65">
                        {a.extension.toUpperCase()} · {(a.sizeBytes / 1024).toFixed(0)} KB · {formatShortDate(a.createdAt)}
                      </p>
                    </div>
                    {canDownload && (
                      <a
                        href={`/api/admin/rfqs/${rfq.id}/attachments/${a.id}`}
                        download={a.originalName}
                        className="inline-flex min-h-10 items-center gap-2 border border-ink/30 px-4 font-body text-sm font-semibold hover:border-ink"
                      >
                        <Download size={15} aria-hidden="true" /> Download
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 font-body text-xs text-ink/65">Every download is recorded in the history below.</p>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Status">
            <div className="mb-4"><Badge tone={rfq.status}>{RFQ_STATUS_LABELS[rfq.status]}</Badge></div>
            <label htmlFor="status" className="block font-mono text-[11px] uppercase tracking-wider text-ink/65">Change status</label>
            <Select id="status" value={status ?? rfq.status} onChange={(e) => setStatus(e.target.value as RfqStatus)} disabled={saving}>
              {STATUSES.map((s) => <option key={s} value={s}>{RFQ_STATUS_LABELS[s]}</option>)}
            </Select>
            <Button variant="primary" className="mt-4 w-full" onClick={saveStatus} disabled={saving || status === rfq.status}>
              {saving ? "Saving…" : "Update status"}
            </Button>
          </Card>

          <Card title="Customer">
            <p className="font-display text-lg font-bold">{rfq.name}</p>
            <p className="font-body text-sm text-ink/75">{rfq.company}</p>
            <p className="font-body text-sm text-ink/60">{rfq.country}</p>
            <div className="mt-5 space-y-2 font-body text-sm">
              <a href={`mailto:${rfq.email}?subject=${encodeURIComponent(`Re: ${rfq.rfqNumber}`)}`} className="flex items-center gap-2 break-all hover:text-brass-deep">
                <Mail size={15} aria-hidden="true" /> {rfq.email}
              </a>
              <a href={`tel:${rfq.phone.replace(/[^+0-9]/g, "")}`} className="flex items-center gap-2 hover:text-brass-deep">
                <Phone size={15} aria-hidden="true" /> {rfq.phone}
              </a>
            </div>
          </Card>

          <Card title="History">
            {rfq.history.length === 0 ? (
              <p className="font-body text-sm text-ink/60">No recorded actions yet.</p>
            ) : (
              <ol className="space-y-4">
                {rfq.history.map((h) => (
                  <li key={h.id} className="border-l-2 border-line pl-4">
                    <p className="font-body text-sm">{h.summary}</p>
                    <p className="font-mono text-[11px] text-ink/65">{h.actor?.name ?? "System"} · {formatDate(h.createdAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[11px] uppercase tracking-wider text-ink/65">{label}</dt>
      <dd className="mt-1.5 font-body text-sm">{children || <span className="text-ink/65">Not specified</span>}</dd>
    </div>
  );
}
