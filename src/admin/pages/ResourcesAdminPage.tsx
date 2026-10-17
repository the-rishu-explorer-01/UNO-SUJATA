import { useEffect, useState, type FormEvent } from "react";
import { adminApi, RESOURCE_TYPE_OPTIONS, type AdminResource, type ResourceBody } from "@/admin/api";
import { Badge, Button, Card, Empty, Field, Notice, PageHeader, Select, TextArea, TextInput, errorText, formatShortDate } from "@/admin/ui";

const blank: ResourceBody = { title: "", type: "CATALOGUE", description: "", sortOrder: 0, published: false };

/**
 * Documents are published only after a PDF has been uploaded. The server refuses to publish without a file,
 * so the public page can never link to a document that does not exist.
 */
export default function ResourcesAdminPage() {
  const [items, setItems] = useState<AdminResource[] | null>(null);
  const [form, setForm] = useState<ResourceBody>(blank);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = () => adminApi.adminResources().then(setItems).catch((e) => setError(errorText(e)));
  useEffect(() => {
    reload();
  }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.createResource(form);
      setForm(blank);
      setNotice("Added. Upload its PDF before publishing.");
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const update = async (r: AdminResource, patch: Partial<ResourceBody>) => {
    setError(null);
    setNotice(null);
    try {
      await adminApi.updateResource(r.id, {
        title: r.title,
        type: r.type,
        description: r.description,
        sortOrder: r.sortOrder,
        published: r.published,
        ...patch,
      });
      setNotice(patch.published ? "Published." : "Saved.");
      await reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const upload = async (r: AdminResource, file: File | undefined) => {
    if (!file) return;
    setError(null);
    setNotice(null);
    try {
      await adminApi.uploadResourceFile(r.id, file);
      setNotice(`Uploaded ${file.name}.`);
      await reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const remove = async (r: AdminResource) => {
    if (!window.confirm(`Delete “${r.title}” and its file?`)) return;
    try {
      await adminApi.deleteResource(r.id);
      setNotice("Deleted.");
      await reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <>
      <PageHeader title="Resources" description="Documents for download. Upload a PDF, then publish. Nothing is shown to visitors until it is published with a file." />
      {error && <Notice kind="error">{error}</Notice>}
      {notice && <Notice kind="success">{notice}</Notice>}

      <Card title="Add a document">
        <form onSubmit={create} className="grid gap-5 md:grid-cols-2">
          <Field label="Title" htmlFor="res-title">
            <TextInput id="res-title" value={form.title} maxLength={160} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>
          <Field label="Type" htmlFor="res-type">
            <Select id="res-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as ResourceBody["type"] })}>
              {RESOURCE_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Description" htmlFor="res-desc" hint="Say what the document contains, in one or two sentences.">
              <TextArea id="res-desc" rows={2} value={form.description} maxLength={600} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </Field>
          </div>
          <div>
            <Button type="submit" variant="primary" disabled={busy}>{busy ? "Adding…" : "Add document"}</Button>
          </div>
        </form>
      </Card>

      {items === null ? (
        <p className="font-mono text-xs uppercase tracking-technical text-ink/65">Loading…</p>
      ) : items.length === 0 ? (
        <Empty>No documents yet. Add one above, then upload its PDF.</Empty>
      ) : (
        <ul className="divide-y divide-line border border-line bg-paper">
          {items.map((r) => (
            <li key={r.id} className="grid gap-4 p-5 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5">
                <p className="font-display text-base font-bold">{r.title}</p>
                <p className="font-body text-xs text-ink/60">{RESOURCE_TYPE_OPTIONS.find((t) => t.value === r.type)?.label} · updated {formatShortDate(r.updatedAt)}</p>
                <p className="mt-1 font-mono text-[11px] text-ink/65">
                  {r.fileUrl ? `${r.fileName} · ${r.sizeBytes ? Math.round(r.sizeBytes / 1024) : 0} KB` : "No file uploaded"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:col-span-4">
                <Badge tone={r.published ? "live" : "draft"}>{r.published ? "Published" : "Not published"}</Badge>
                <label className="inline-flex min-h-10 cursor-pointer items-center border border-ink/30 px-3 font-body text-xs font-semibold hover:border-ink">
                  {r.fileUrl ? "Replace PDF" : "Upload PDF"}
                  <input type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => upload(r, e.target.files?.[0])} aria-label={`Upload PDF for ${r.title}`} />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:col-span-3 lg:justify-end">
                {r.published ? (
                  <Button className="!min-h-9 !text-xs" onClick={() => update(r, { published: false })}>Unpublish</Button>
                ) : (
                  <Button variant="primary" className="!min-h-9 !text-xs" disabled={!r.fileUrl} title={r.fileUrl ? "" : "Upload a PDF first"} onClick={() => update(r, { published: true })}>Publish</Button>
                )}
                <Button variant="danger" className="!min-h-9 !text-xs" onClick={() => remove(r)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
