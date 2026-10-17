import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, Empty, Field, Notice, PageHeader, TextArea, TextInput, errorText } from "@/admin/ui";
import type { ListItem } from "@/admin/api";

/** Shared editor for industries and capabilities: a name plus a short description, with create and edit. */
export interface ManagedListConfig {
  title: string;
  description: string;
  primaryKey: "name" | "title";
  primaryLabel: string;
  secondaryKey: "summary" | "description";
  secondaryLabel: string;
  primaryMax: number;
  secondaryMax: number;
  load: () => Promise<ListItem[]>;
  create: (v: { primary: string; secondary: string }) => Promise<unknown>;
  update: (id: string, v: { primary: string; secondary: string }) => Promise<unknown>;
}

export default function ManagedListPage({ config }: { config: ManagedListConfig }) {
  const [items, setItems] = useState<ListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ primary: "", secondary: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ primary: "", secondary: "" });
  const [busy, setBusy] = useState(false);

  const reload = () => config.load().then(setItems).catch((e) => setError(errorText(e)));
  useEffect(() => {
    reload();
    // config is stable per page; reload once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (item: ListItem, key: "primary" | "secondary"): string => {
    if (key === "primary") return (config.primaryKey === "name" ? item.name : item.title) ?? "";
    return (config.secondaryKey === "summary" ? item.summary : item.description) ?? "";
  };

  const run = async (fn: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(message);
      setEditId(null);
      await reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const create = (e: FormEvent) => {
    e.preventDefault();
    if (createForm.primary.trim().length < 2) return setError(`Enter a ${config.primaryLabel.toLowerCase()}.`);
    void run(async () => {
      await config.create({ primary: createForm.primary.trim(), secondary: createForm.secondary.trim() });
      setCreateForm({ primary: "", secondary: "" });
    }, `${config.primaryLabel} added.`);
  };

  return (
    <>
      <PageHeader title={config.title} description={config.description} />
      {error && <Notice kind="error">{error}</Notice>}
      {notice && <Notice kind="success">{notice}</Notice>}

      <Card title={`Add ${config.primaryLabel.toLowerCase()}`}>
        <form onSubmit={create} noValidate className="grid gap-5 md:grid-cols-2">
          <Field label={config.primaryLabel} htmlFor="primary">
            <TextInput id="primary" value={createForm.primary} onChange={(e) => setCreateForm({ ...createForm, primary: e.target.value })} maxLength={config.primaryMax} />
          </Field>
          <Field label={config.secondaryLabel} htmlFor="secondary">
            <TextArea id="secondary" rows={2} value={createForm.secondary} onChange={(e) => setCreateForm({ ...createForm, secondary: e.target.value })} maxLength={config.secondaryMax} />
          </Field>
          <div className="md:col-span-2">
            <Button type="submit" variant="primary" disabled={busy}>Add</Button>
          </div>
        </form>
      </Card>

      {items === null ? (
        <p className="font-mono text-xs uppercase tracking-technical text-ink/65">Loading…</p>
      ) : items.length === 0 ? (
        <Empty>Nothing here yet.</Empty>
      ) : (
        <ul className="divide-y divide-line border border-line bg-paper">
          {items.map((item, i) => (
            <li key={item.id} className="p-5">
              {editId === item.id ? (
                <form
                  className="grid gap-4 md:grid-cols-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(() => config.update(item.id, { primary: editForm.primary.trim(), secondary: editForm.secondary.trim() }), "Saved.");
                  }}
                >
                  <Field label={config.primaryLabel} htmlFor={`e-p-${item.id}`}>
                    <TextInput id={`e-p-${item.id}`} value={editForm.primary} onChange={(e) => setEditForm({ ...editForm, primary: e.target.value })} maxLength={config.primaryMax} />
                  </Field>
                  <Field label={config.secondaryLabel} htmlFor={`e-s-${item.id}`}>
                    <TextArea id={`e-s-${item.id}`} rows={2} value={editForm.secondary} onChange={(e) => setEditForm({ ...editForm, secondary: e.target.value })} maxLength={config.secondaryMax} />
                  </Field>
                  <div className="flex gap-2 md:col-span-2">
                    <Button type="submit" variant="primary" disabled={busy}>Save</Button>
                    <Button variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-6">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-bold">{pick(item, "primary")}</p>
                    <p className="mt-1 font-body text-sm text-ink/65">{pick(item, "secondary") || <span className="text-ink/65">No description</span>}</p>
                    <p className="mt-1 font-mono text-[11px] text-ink/65">Position {i + 1} · /{item.slug}</p>
                  </div>
                  <Button onClick={() => { setEditId(item.id); setEditForm({ primary: pick(item, "primary"), secondary: pick(item, "secondary") }); }}>Edit</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
