import { useEffect, useState, type FormEvent } from "react";
import { adminApi, FAQ_CATEGORY_OPTIONS, type AdminFaq, type FaqBody, type FaqCategory } from "@/admin/api";
import { Badge, Button, Card, Empty, Field, Notice, PageHeader, Select, TextArea, TextInput, errorText } from "@/admin/ui";

const blank: FaqBody = { question: "", answer: "", category: "ORDERING", published: false, sortOrder: 0 };

/** Factual answers only. Add an entry here when the client has confirmed the answer. */
export default function FaqAdminPage() {
  const [items, setItems] = useState<AdminFaq[] | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FaqBody>(blank);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = () => adminApi.faqs().then(setItems).catch((e) => setError(errorText(e)));
  useEffect(() => {
    reload();
  }, []);

  const startEdit = (f: AdminFaq | null) => {
    setError(null);
    setNotice(null);
    setEditing(f ? f.id : "new");
    setForm(f ? { question: f.question, answer: f.answer, category: f.category, published: f.published, sortOrder: f.sortOrder } : blank);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (editing === "new") await adminApi.createFaq(form);
      else if (editing) await adminApi.updateFaq(editing, form);
      setNotice(editing === "new" ? "Question added." : "Question saved.");
      setEditing(null);
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (f: AdminFaq) => {
    if (!window.confirm("Delete this question?")) return;
    try {
      await adminApi.deleteFaq(f.id);
      setNotice("Question deleted.");
      await reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const byCategory = (cat: FaqCategory) => (items ?? []).filter((i) => i.category === cat);

  return (
    <>
      <PageHeader
        title="FAQ"
        description="Questions shown on the public FAQ page. Only published entries appear. Publish only answers the business has confirmed."
        actions={<Button variant="primary" onClick={() => startEdit(null)}>New question</Button>}
      />
      {error && <Notice kind="error">{error}</Notice>}
      {notice && <Notice kind="success">{notice}</Notice>}

      {editing && (
        <Card title={editing === "new" ? "New question" : "Edit question"}>
          <form onSubmit={save} className="grid gap-5">
            <Field label="Question" htmlFor="faq-q">
              <TextInput id="faq-q" value={form.question} maxLength={300} onChange={(e) => setForm({ ...form, question: e.target.value })} required />
            </Field>
            <Field label="Answer" htmlFor="faq-a" hint="Plain factual wording. No promises about lead times, certifications or prices unless confirmed.">
              <TextArea id="faq-a" rows={5} value={form.answer} maxLength={3000} onChange={(e) => setForm({ ...form, answer: e.target.value })} required />
            </Field>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Category" htmlFor="faq-cat">
                <Select id="faq-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as FaqCategory })}>
                  {FAQ_CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </Select>
              </Field>
              <Field label="Order" htmlFor="faq-order" hint="Lower numbers first.">
                <TextInput id="faq-order" type="number" min={0} max={999} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })} />
              </Field>
              <label className="flex min-h-10 items-end gap-3 pb-2 font-body text-sm">
                <input type="checkbox" className="h-4 w-4 accent-[#7D5F33]" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
                Published on the website
              </label>
            </div>
            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {items === null ? (
        <p className="font-mono text-xs uppercase tracking-technical text-ink/65">Loading…</p>
      ) : items.length === 0 ? (
        <Empty>No questions yet. The standard answers are added when the database is seeded.</Empty>
      ) : (
        FAQ_CATEGORY_OPTIONS.map((cat) => {
          const rows = byCategory(cat.value);
          if (rows.length === 0) return null;
          return (
            <Card key={cat.value} title={cat.label}>
              <ul className="divide-y divide-line">
                {rows.map((f) => (
                  <li key={f.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-body text-sm font-semibold">{f.question}</p>
                      <p className="mt-1 line-clamp-2 font-body text-xs text-ink/60">{f.answer}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone={f.published ? "live" : "draft"}>{f.published ? "Published" : "Draft"}</Badge>
                      <Button variant="ghost" className="!min-h-9 !text-xs" onClick={() => startEdit(f)}>Edit</Button>
                      <Button variant="danger" className="!min-h-9 !text-xs" onClick={() => remove(f)}>Delete</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })
      )}
    </>
  );
}
