import { useEffect, useMemo, useState, type FormEvent } from "react";
import { adminApi, AdminApiError, type CustomerBodyDto, type CustomerDto } from "@/admin/api";
import { Button, Card, Empty, Field, Notice, PageHeader, Select, TextArea, TextInput, errorText } from "@/admin/ui";
import { STATE_CODES } from "@/data/indianStates";

const blank: CustomerBodyDto = { name: "", billingAddress: "", stateName: "", stateCode: "", active: true };
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Customer records for the CRM. GSTIN is kept as an identification reference only; it is not verified. */
export default function CustomersPage() {
  const [items, setItems] = useState<CustomerDto[] | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ id: string | null; form: CustomerBodyDto } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const reload = () => adminApi.customers(true).then(setItems).catch((e) => setNotice({ kind: "error", text: errorText(e) }));
  useEffect(() => {
    reload();
  }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (items ?? []).filter((c) => !q || [c.name, c.gstin ?? "", c.contactName ?? "", c.stateName].some((v) => v.toLowerCase().includes(q)));
  }, [items, search]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setErrors({});
    const f = editing.form;
    const local: Record<string, string> = {};
    if (f.name.trim().length < 2) local.name = "Enter the customer's name";
    if (f.billingAddress.trim().length < 5) local.billingAddress = "Enter the billing address";
    if (!f.stateCode) local.stateCode = "Choose a state";
    if (f.gstin && !GSTIN.test(f.gstin)) local.gstin = "GSTIN format is not valid";
    if (Object.keys(local).length) return setErrors(local);
    try {
      if (editing.id) await adminApi.updateCustomer(editing.id, f);
      else await adminApi.createCustomer(f);
      setEditing(null);
      setNotice({ kind: "success", text: "Customer saved." });
      await reload();
    } catch (err) {
      if (err instanceof AdminApiError && err.fields) {
        const m: Record<string, string> = {};
        for (const [k, v] of Object.entries(err.fields)) if (v[0]) m[k] = v[0];
        setErrors(m);
      }
      setNotice({ kind: "error", text: errorText(err) });
    }
  };

  const set = (patch: Partial<CustomerBodyDto>) => setEditing((e) => (e ? { ...e, form: { ...e.form, ...patch } } : e));

  return (
    <>
      <PageHeader
        title="Customers"
        description="Customer records for quotations, orders and follow-ups. Inactive customers are kept for history but hidden from new work."
        actions={<Button variant="primary" onClick={() => setEditing({ id: null, form: { ...blank } })}>Add customer</Button>}
      />
      {notice && <Notice kind={notice.kind}>{notice.text}</Notice>}

      <TextInput type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, GSTIN, contact or state" aria-label="Search customers" maxLength={100} />

      {editing && (
        <Card title={editing.id ? "Edit customer" : "New customer"}>
          <form onSubmit={save} noValidate className="grid gap-5 sm:grid-cols-2">
            <Field label="Company or customer name" htmlFor="cn" error={errors.name}><TextInput id="cn" value={editing.form.name} maxLength={160} onChange={(e) => set({ name: e.target.value })} aria-invalid={!!errors.name} /></Field>
            <Field label="GSTIN (optional reference)" htmlFor="cg" error={errors.gstin} hint="Format is checked. Registration is not verified.">
              <TextInput id="cg" value={editing.form.gstin ?? ""} maxLength={15} className="font-mono uppercase" onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} />
            </Field>
            <div className="sm:col-span-2"><Field label="Billing address" htmlFor="cb" error={errors.billingAddress}><TextArea id="cb" rows={2} maxLength={400} value={editing.form.billingAddress} onChange={(e) => set({ billingAddress: e.target.value })} /></Field></div>
            <div className="sm:col-span-2"><Field label="Shipping address (if different)" htmlFor="cs"><TextArea id="cs" rows={2} maxLength={400} value={editing.form.shippingAddress ?? ""} onChange={(e) => set({ shippingAddress: e.target.value })} /></Field></div>
            <Field label="State" htmlFor="cst" error={errors.stateCode}>
              <Select id="cst" value={editing.form.stateCode} onChange={(e) => set({ stateCode: e.target.value, stateName: STATE_CODES[e.target.value] ?? "" })}>
                <option value="">Choose a state</option>
                {Object.entries(STATE_CODES).sort((a, b) => a[1].localeCompare(b[1])).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
              </Select>
            </Field>
            <Field label="Contact person" htmlFor="cc"><TextInput id="cc" value={editing.form.contactName ?? ""} maxLength={120} onChange={(e) => set({ contactName: e.target.value })} /></Field>
            <Field label="Phone" htmlFor="cp"><TextInput id="cp" value={editing.form.phone ?? ""} maxLength={30} onChange={(e) => set({ phone: e.target.value })} /></Field>
            <Field label="Email" htmlFor="ce" error={errors.email}><TextInput id="ce" type="email" value={editing.form.email ?? ""} maxLength={254} onChange={(e) => set({ email: e.target.value })} /></Field>
            <label className="flex min-h-10 items-center gap-3 font-body text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[#7D5F33]" checked={editing.form.active} onChange={(e) => set({ active: e.target.checked })} />
              Active
            </label>
            <div className="flex gap-3 sm:col-span-2">
              <Button type="submit" variant="primary">Save customer</Button>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {items === null ? (
        <p className="font-mono text-xs uppercase tracking-technical text-ink/65">Loading…</p>
      ) : shown.length === 0 ? (
        <Empty>{items.length === 0 ? "No customers yet. Add the first one." : "No customers match this search."}</Empty>
      ) : (
        <ul className="divide-y divide-line border border-line bg-paper">
          {shown.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-body text-sm font-semibold">{c.name} {!c.active && <span className="font-mono text-[10px] uppercase text-ink/65">· inactive</span>}</p>
                <p className="font-body text-xs text-ink/65">{c.stateName}{c.contactName ? ` · ${c.contactName}` : ""}{c.gstin ? ` · GSTIN ${c.gstin}` : ""}</p>
              </div>
              <Button className="!min-h-9 !text-xs" onClick={() => setEditing({ id: c.id, form: { name: c.name, billingAddress: c.billingAddress, shippingAddress: c.shippingAddress ?? "", gstin: c.gstin ?? "", stateName: c.stateName, stateCode: c.stateCode, contactName: c.contactName ?? "", phone: c.phone ?? "", email: c.email ?? "", active: c.active } })}>Edit</Button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
