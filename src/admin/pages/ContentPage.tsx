import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { adminApi, AdminApiError } from "@/admin/api";
import { Button, Card, Field, Notice, PageHeader, TextArea, TextInput, errorText } from "@/admin/ui";

type Tab = "hero" | "stats" | "sections" | "quality" | "about" | "contact";

const TABS: { id: Tab; label: string; key: string; help: string }[] = [
  { id: "hero", label: "Hero", key: "homepage.hero", help: "The first thing visitors read on the homepage." },
  { id: "stats", label: "Statistics", key: "homepage.stats", help: "Up to six verified facts shown in the trust bar. Only use confirmed figures." },
  { id: "sections", label: "Homepage sections", key: "homepage.sections", help: "Switch homepage sections on or off. Order is set by the site design." },
  { id: "quality", label: "Quality", key: "quality", help: "Quality section introduction. Do not add certifications that are not verified." },
  { id: "about", label: "About", key: "about", help: "Company introduction and story." },
  { id: "contact", label: "Contact", key: "contact", help: "Contact details shown in the footer and contact pages." },
];

const SECTION_LABELS: Record<string, string> = {
  trust: "Trust bar (verified facts)",
  intro: "Company introduction",
  products: "Product range",
  custom: "Custom manufacturing call-out",
  industries: "Industries",
  journey: "Manufacturing journey",
  quality: "Quality",
  cta: "Final call to action",
};

export default function ContentPage() {
  const [tab, setTab] = useState<Tab>("hero");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    adminApi.content().then(setData).catch((e) => setError(errorText(e)));
  }, []);

  const current = TABS.find((t) => t.id === tab)!;

  const save = async (key: string, value: unknown) => {
    setError(null);
    setNotice(null);
    try {
      const res = await adminApi.saveContent(key, value);
      setData((prev) => ({ ...(prev ?? {}), [key]: res.value }));
      setNotice("Saved. The change is visible to visitors straight away.");
      return true;
    } catch (e) {
      setError(e instanceof AdminApiError && e.fields ? "Please check the highlighted fields." : errorText(e));
      return e;
    }
  };

  return (
    <>
      <PageHeader title="Content" description="Edit the words and facts on the website. Changes are validated and recorded in the history." />

      <div role="tablist" aria-label="Content sections" className="-mx-1 flex gap-1 overflow-x-auto border-b border-line pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setNotice(null);
              setError(null);
            }}
            className={`min-h-10 shrink-0 border-b-2 px-4 font-body text-sm font-semibold ${tab === t.id ? "border-ink text-ink" : "border-transparent text-ink/65 hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <Notice kind="error">{error}</Notice>}
      {notice && <Notice kind="success">{notice}</Notice>}

      {!data ? (
        <p className="font-mono text-xs uppercase tracking-technical text-ink/65">Loading content…</p>
      ) : (
        <Card title={current.label}>
          <p className="mb-6 font-body text-sm text-ink/65">{current.help}</p>
          {tab === "hero" && <FlatForm storeKey="homepage.hero" initial={data["homepage.hero"] as Record<string, string>} onSave={save} fields={[
            { name: "eyebrow", label: "Eyebrow line", max: 120 },
            { name: "headlineLine1", label: "Headline, line 1", max: 80 },
            { name: "headlineLine2", label: "Headline, line 2", max: 80 },
            { name: "supporting", label: "Supporting text", max: 600, long: true },
            { name: "primaryCta", label: "Primary button", max: 40 },
            { name: "secondaryCta", label: "Secondary button", max: 40 },
          ]} />}
          {tab === "quality" && <QualityForm initial={data.quality as QualityValue} onSave={(v) => save("quality", v)} />}
          {tab === "about" && <FlatForm storeKey="about" initial={data.about as Record<string, string>} onSave={save} fields={[
            { name: "headline", label: "Headline", max: 160 },
            { name: "body", label: "Story", max: 4000, long: true },
          ]} />}
          {tab === "contact" && <FlatForm storeKey="contact" initial={data.contact as Record<string, string>} onSave={save} fields={[
            { name: "phone", label: "Phone", max: 60 },
            { name: "email", label: "Email", max: 254 },
            { name: "address", label: "Address", max: 400, long: true },
            { name: "hours", label: "Opening hours", max: 200, hint: "Leave blank until confirmed." },
          ]} />}
          {tab === "stats" && <StatsForm initial={(data["homepage.stats"] as { items: { value: string; label: string }[] }).items} onSave={(items) => save("homepage.stats", { items })} />}
          {tab === "sections" && <SectionsForm initial={(data["homepage.sections"] as { sections: { key: string; enabled: boolean }[] }).sections} onSave={(sections) => save("homepage.sections", { sections })} />}
        </Card>
      )}
    </>
  );
}

type FlatField = { name: string; label: string; max: number; long?: boolean; hint?: string };

interface QualityValue {
  title: string;
  intro: string;
  certifications: { name: string; issuer: string; reference: string; validUntil: string }[];
}

/** Saves the whole quality object, so certifications are never dropped by a text-only save. */
function QualityForm({ initial, onSave }: { initial: QualityValue; onSave: (v: QualityValue) => Promise<unknown> }) {
  const { register, control, handleSubmit, formState: { isSubmitting } } = useForm<QualityValue>({
    defaultValues: { title: initial.title, intro: initial.intro, certifications: initial.certifications ?? [] },
  });
  const certs = useFieldArray({ control, name: "certifications" });
  return (
    <form onSubmit={handleSubmit(async (v) => { await onSave(v); })} noValidate className="space-y-8">
      <Field label="Title" htmlFor="q-title"><TextInput id="q-title" maxLength={120} {...register("title")} /></Field>
      <Field label="Introduction" htmlFor="q-intro"><TextArea id="q-intro" rows={4} maxLength={800} {...register("intro")} /></Field>

      <div>
        <h3 className="font-display text-base font-bold">Certifications</h3>
        <p className="mt-1 font-body text-sm text-ink/65">Add only certifications you hold. Each needs the issuing body and a reference number. Leave this empty until they are verified; the website then shows a placeholder.</p>
        <div className="mt-4 space-y-4">
          {certs.fields.map((f, i) => (
            <div key={f.id} className="grid gap-3 border border-line p-4 sm:grid-cols-2">
              <TextInput aria-label={`Certification ${i + 1} name`} placeholder="Name, e.g. ISO 9001" maxLength={120} {...register(`certifications.${i}.name` as const)} />
              <TextInput aria-label={`Certification ${i + 1} issuer`} placeholder="Issuing body" maxLength={160} {...register(`certifications.${i}.issuer` as const)} />
              <TextInput aria-label={`Certification ${i + 1} reference`} placeholder="Certificate number" maxLength={80} {...register(`certifications.${i}.reference` as const)} />
              <TextInput aria-label={`Certification ${i + 1} valid until`} placeholder="Valid until" maxLength={40} {...register(`certifications.${i}.validUntil` as const)} />
              <div className="sm:col-span-2"><Button variant="ghost" onClick={() => certs.remove(i)}>Remove</Button></div>
            </div>
          ))}
          <Button onClick={() => certs.append({ name: "", issuer: "", reference: "", validUntil: "" })} disabled={certs.fields.length >= 20}>Add certification</Button>
        </div>
      </div>

      <Button type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}

function FlatForm({ initial, fields, onSave }: { storeKey: string; initial: Record<string, string>; fields: FlatField[]; onSave: (v: unknown) => Promise<unknown> }) {
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<Record<string, string>>({ defaultValues: initial });
  return (
    <form onSubmit={handleSubmit(async (values) => { await onSave(values); })} noValidate className="space-y-5">
      {fields.map((f) => (
        <Field key={f.name} label={f.label} htmlFor={f.name} hint={f.hint} error={errors[f.name]?.message as string | undefined}>
          {f.long ? (
            <TextArea id={f.name} rows={4} maxLength={f.max} {...register(f.name)} />
          ) : (
            <TextInput id={f.name} maxLength={f.max} {...register(f.name)} />
          )}
        </Field>
      ))}
      <Button type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}

function StatsForm({ initial, onSave }: { initial: { value: string; label: string }[]; onSave: (items: { value: string; label: string }[]) => Promise<unknown> }) {
  const { register, control, handleSubmit, formState: { isSubmitting } } = useForm<{ items: { value: string; label: string }[] }>({ defaultValues: { items: initial } });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  return (
    <form onSubmit={handleSubmit(async (v) => { await onSave(v.items); })} className="space-y-4">
      {fields.map((f, i) => (
        <div key={f.id} className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
          <TextInput aria-label={`Figure ${i + 1}`} maxLength={20} {...register(`items.${i}.value` as const)} />
          <TextInput aria-label={`Label ${i + 1}`} maxLength={80} {...register(`items.${i}.label` as const)} />
          <Button variant="ghost" onClick={() => remove(i)}>Remove</Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => append({ value: "", label: "" })} disabled={fields.length >= 6}>Add figure</Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  );
}

function SectionsForm({ initial, onSave }: { initial: { key: string; enabled: boolean }[]; onSave: (sections: { key: string; enabled: boolean }[]) => Promise<unknown> }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<{ sections: { key: string; enabled: boolean }[] }>({ defaultValues: { sections: initial } });
  return (
    <form onSubmit={handleSubmit(async (v) => { await onSave(v.sections.map((s) => ({ key: s.key, enabled: !!s.enabled }))); })} className="space-y-4">
      <ul className="divide-y divide-line border border-line">
        {initial.map((s, i) => (
          <li key={s.key} className="flex min-h-12 items-center justify-between gap-4 px-4 py-3">
            <input type="hidden" {...register(`sections.${i}.key` as const)} />
            <span className="font-body text-sm">{SECTION_LABELS[s.key] ?? s.key}</span>
            <label className="flex cursor-pointer items-center gap-2 font-body text-sm">
              <input type="checkbox" className="h-4 w-4 accent-[#7D5F33]" {...register(`sections.${i}.enabled` as const)} />
              Shown
            </label>
          </li>
        ))}
      </ul>
      <Button type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}
