export interface SpecRow {
  label: string;
  value: string | null;
}

/** Structured technical table. Null or empty values render as "Available on request", never invented. */
export default function SpecTable({ rows }: { rows: SpecRow[] }) {
  return (
    <dl className="divide-y divide-line border-y border-line">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[200px_1fr] sm:gap-6">
          <dt className="font-mono text-[11px] uppercase tracking-technical text-ink/65">{r.label}</dt>
          <dd className={`font-body text-sm ${r.value ? "text-ink" : "italic text-ink/65"}`}>{r.value || "Available on request"}</dd>
        </div>
      ))}
    </dl>
  );
}
