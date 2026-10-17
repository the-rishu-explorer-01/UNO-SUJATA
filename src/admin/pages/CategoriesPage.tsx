import { useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { adminApi, type CategoryRow } from "@/admin/api";
import { Badge, Button, Card, Empty, Field, Notice, PageHeader, TextArea, TextInput, errorText } from "@/admin/ui";

export default function CategoriesPage() {
  const [rows, setRows] = useState<CategoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", summary: "" });
  const [createForm, setCreateForm] = useState({ name: "", summary: "" });
  const [busy, setBusy] = useState(false);

  const reload = () => adminApi.categories().then(setRows).catch((e) => setError(errorText(e)));
  useEffect(() => {
    reload();
  }, []);

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(message);
      await reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const create = (e: FormEvent) => {
    e.preventDefault();
    if (createForm.name.trim().length < 2) return setError("Enter a category name.");
    void run(async () => {
      await adminApi.createCategory({ name: createForm.name.trim(), summary: createForm.summary.trim() });
      setCreateForm({ name: "", summary: "" });
    }, "Category created.");
  };

  const move = (index: number, dir: -1 | 1) => {
    if (!rows) return;
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    setRows(next);
    void run(() => adminApi.reorderCategories(next.map((r) => r.id)), "Order saved.");
  };

  return (
    <>
      <PageHeader title="Categories" description="Groups shown on the website. Their order here is the order visitors see." />
      {error && <Notice kind="error">{error}</Notice>}
      {notice && <Notice kind="success">{notice}</Notice>}

      <Card title="New category">
        <form onSubmit={create} noValidate className="grid gap-5 md:grid-cols-[1fr_2fr_auto] md:items-end">
          <Field label="Name" htmlFor="cat-name">
            <TextInput id="cat-name" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} maxLength={80} />
          </Field>
          <Field label="Summary" htmlFor="cat-summary" hint="Shown under the category name.">
            <TextInput id="cat-summary" value={createForm.summary} onChange={(e) => setCreateForm({ ...createForm, summary: e.target.value })} maxLength={300} />
          </Field>
          <Button type="submit" variant="primary" disabled={busy}>Add category</Button>
        </form>
      </Card>

      {rows === null ? (
        <p className="font-mono text-xs uppercase tracking-technical text-ink/65">Loading…</p>
      ) : rows.length === 0 ? (
        <Empty>No categories yet. Add the first one above.</Empty>
      ) : (
        <ul className="divide-y divide-line border border-line bg-paper">
          {rows.map((c, i) => (
            <li key={c.id} className="p-5">
              {editing === c.id ? (
                <form
                  className="grid gap-4 md:grid-cols-[1fr_2fr_auto_auto] md:items-end"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      await adminApi.updateCategory(c.id, { name: draft.name.trim(), summary: draft.summary.trim() });
                      setEditing(null);
                    }, "Category saved.");
                  }}
                >
                  <Field label="Name" htmlFor={`name-${c.id}`}>
                    <TextInput id={`name-${c.id}`} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} />
                  </Field>
                  <Field label="Summary" htmlFor={`sum-${c.id}`}>
                    <TextArea id={`sum-${c.id}`} rows={2} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} maxLength={300} />
                  </Field>
                  <Button type="submit" variant="primary" disabled={busy}>Save</Button>
                  <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </form>
              ) : (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-lg font-bold">{c.name}</p>
                      {c.archivedAt ? <Badge tone="archived">Archived</Badge> : <Badge tone="live">Active</Badge>}
                    </div>
                    <p className="mt-1 font-body text-sm text-ink/65">{c.summary}</p>
                    <p className="mt-1 font-mono text-[11px] text-ink/65">/products/category/{c.slug} · {c.productCount} product{c.productCount === 1 ? "" : "s"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="ghost" aria-label={`Move ${c.name} up`} onClick={() => move(i, -1)} disabled={busy || i === 0}><ArrowUp size={16} /></Button>
                    <Button variant="ghost" aria-label={`Move ${c.name} down`} onClick={() => move(i, 1)} disabled={busy || i === rows.length - 1}><ArrowDown size={16} /></Button>
                    <Button onClick={() => { setEditing(c.id); setDraft({ name: c.name, summary: c.summary }); }}>Edit</Button>
                    {c.archivedAt ? (
                      <Button onClick={() => void run(() => adminApi.restoreCategory(c.id), "Category restored.")} disabled={busy}>Restore</Button>
                    ) : (
                      <Button variant="danger" onClick={() => void run(() => adminApi.archiveCategory(c.id), "Category archived.")} disabled={busy}>Archive</Button>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
