import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { AdminApiError } from "@/admin/api";

/** Shared primitives for the admin UI. Desktop-first; all controls keep 40px+ hit areas for tablet use. */

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl font-body text-sm text-ink/65">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, actions, className = "" }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`border border-line bg-paper ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          {title && <h2 className="font-display text-sm font-bold uppercase tracking-wide">{title}</h2>}
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

type Variant = "primary" | "secondary" | "danger" | "ghost";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-bone hover:bg-brass-deep",
  secondary: "border border-ink/30 bg-paper text-ink hover:border-ink",
  danger: "border border-red-800/40 bg-paper text-red-800 hover:bg-red-50",
  ghost: "text-ink/70 hover:text-ink",
};

export function Button({ variant = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={props.type ?? "button"}
      {...props}
      className={`inline-flex min-h-10 items-center justify-center gap-2 px-4 font-body text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}

const control =
  "mt-1.5 w-full min-h-10 border border-ink/40 bg-paper px-3 py-2 font-body text-sm focus:border-ink focus:outline-none focus:ring-2 focus:ring-brass/50 aria-[invalid=true]:border-red-800 disabled:bg-bone";

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block font-mono text-[11px] uppercase tracking-wider text-ink/65">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 font-body text-xs text-ink/65">{hint}</p>}
      {error && <p role="alert" className="mt-1 font-body text-xs text-red-800">{error}</p>}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${control} ${props.className ?? ""}`} />;
}

const badgeTone: Record<string, string> = {
  NEW: "bg-brass/15 text-brass-deep border-brass/40",
  UNDER_REVIEW: "bg-sky-50 text-sky-900 border-sky-300",
  TECHNICAL_REVIEW: "bg-violet-50 text-violet-900 border-violet-300",
  QUOTE_PREPARED: "bg-emerald-50 text-emerald-900 border-emerald-300",
  CLOSED: "bg-ink/5 text-ink/60 border-ink/20",
  live: "bg-emerald-50 text-emerald-900 border-emerald-300",
  draft: "bg-amber-50 text-amber-900 border-amber-300",
  archived: "bg-ink/5 text-ink/60 border-ink/20",
  NEW_CONTACT: "bg-brass/15 text-brass-deep border-brass/40",
  HANDLED: "bg-ink/5 text-ink/60 border-ink/20",
};

export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide ${badgeTone[tone] ?? "border-ink/20"}`}>
      {children}
    </span>
  );
}

export function Notice({ kind, children }: { kind: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "border-red-800/40 bg-red-50 text-red-900",
    success: "border-emerald-700/40 bg-emerald-50 text-emerald-900",
    info: "border-ink/20 bg-bone text-ink",
  }[kind];
  const Icon = kind === "error" ? AlertTriangle : CheckCircle2;
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`flex gap-3 border px-4 py-3 font-body text-sm ${styles}`}>
      {kind !== "info" && <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />}
      <div>{children}</div>
    </div>
  );
}

/** Turns any caught error into a line a staff member can act on. Never shows stack traces. */
export function errorText(err: unknown): string {
  if (err instanceof AdminApiError) return err.message;
  return "Something went wrong. Please try again.";
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-ink/25 px-6 py-10 text-center font-body text-sm text-ink/60">{children}</p>;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
