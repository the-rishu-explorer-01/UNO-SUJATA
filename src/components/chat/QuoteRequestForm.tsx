import { useRef, useState, type FormEvent } from "react";
import { api, ApiError, newIdempotencyKey } from "@/lib/api";

/**
 * Quotation request from inside the assistant. Submits to the existing RFQ endpoint, so the enquiry appears in
 * the admin's inquiry list. The reference is shown only after the server confirms receipt.
 */
export default function QuoteRequestForm({
  product,
  onBack,
  onSubmitted,
}: {
  product: { slug: string; name: string; code: string | null } | null;
  onBack: () => void;
  onSubmitted: (reference: string) => void;
}) {
  const [v, setV] = useState({ name: "", company: "", email: "", phone: "", country: "India", partNumber: product?.code ?? "", quantity: "", message: "", consent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const key = useRef(newIdempotencyKey());
  const set = (patch: Partial<typeof v>) => setV((prev) => ({ ...prev, ...patch }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (v.name.trim().length < 2) e.name = "Enter your name";
    if (v.company.trim().length < 2) e.company = "Enter your company name";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Enter a valid business email";
    if (!/^\+?[0-9\s()-]{7,20}$/.test(v.phone.trim())) e.phone = "Enter a valid phone number";
    if (v.country.trim().length < 2) e.country = "Enter your country";
    if (v.message.trim().length < 20) e.message = "Describe the requirement in at least 20 characters";
    if (!v.consent) e.consent = "Please agree to be contacted about this request";
    return e;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const e2 = validate();
    setErrors(e2);
    if (Object.keys(e2).length) return;
    setBusy(true);
    try {
      const res = await api.submitRfq(
        {
          name: v.name.trim(),
          company: v.company.trim(),
          email: v.email.trim(),
          phone: v.phone.trim(),
          country: v.country.trim(),
          productSlugs: product ? [product.slug] : [],
          partNumber: v.partNumber.trim() || undefined,
          quantity: v.quantity.trim() || undefined,
          message: v.message.trim(),
          attachmentIds: [],
          consent: true,
        },
        key.current
      );
      onSubmitted(res.rfqNumber);
    } catch (err) {
      setServerError(
        err instanceof ApiError && err.status === 422
          ? "Please check the highlighted details and try again."
          : err instanceof ApiError && err.status === 429
            ? err.message
            : "We could not send your request. Check your connection and try again. Your details are still here."
      );
    } finally {
      setBusy(false);
    }
  };

  const field = (id: keyof typeof v, label: string, extra: Record<string, unknown> = {}) => (
    <div>
      <label htmlFor={`q-${id}`} className="block font-mono text-[10px] uppercase tracking-wider text-ink/70">{label}</label>
      <input
        id={`q-${id}`}
        value={String(v[id])}
        onChange={(e) => set({ [id]: e.target.value } as Partial<typeof v>)}
        aria-invalid={!!errors[id]}
        aria-describedby={errors[id] ? `q-${id}-err` : undefined}
        className="mt-1 min-h-10 w-full border border-ink/40 bg-paper px-2.5 font-body text-sm focus:border-ink focus:outline-none focus:ring-2 focus:ring-brass/60"
        {...extra}
      />
      {errors[id] && <p id={`q-${id}-err`} role="alert" className="mt-1 font-body text-[11px] text-red-800">{errors[id]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-base font-bold">Request a quotation</p>
        <button type="button" onClick={onBack} className="font-body text-xs font-semibold underline underline-offset-4">Back to chat</button>
      </div>
      {product && (
        <p className="border-l-2 border-brass pl-3 font-body text-xs text-ink/75">For: <span className="font-semibold">{product.name}</span></p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {field("name", "Name", { autoComplete: "name" })}
        {field("company", "Company", { autoComplete: "organization" })}
      </div>
      {field("email", "Business email", { type: "email", autoComplete: "email" })}
      <div className="grid grid-cols-2 gap-3">
        {field("phone", "Phone", { type: "tel", autoComplete: "tel" })}
        {field("country", "Country")}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field("partNumber", "Part number (optional)")}
        {field("quantity", "Quantity (optional)")}
      </div>
      <div>
        <label htmlFor="q-message" className="block font-mono text-[10px] uppercase tracking-wider text-ink/70">Requirements</label>
        <textarea
          id="q-message"
          rows={4}
          value={v.message}
          maxLength={3000}
          onChange={(e) => set({ message: e.target.value })}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? "q-message-err" : undefined}
          className="mt-1 w-full border border-ink/40 bg-paper p-2.5 font-body text-sm focus:border-ink focus:outline-none focus:ring-2 focus:ring-brass/60"
        />
        {errors.message && <p id="q-message-err" role="alert" className="mt-1 font-body text-[11px] text-red-800">{errors.message}</p>}
      </div>
      <div>
        <label className="flex items-start gap-2.5 font-body text-xs leading-relaxed">
          <input type="checkbox" checked={v.consent} onChange={(e) => set({ consent: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#7D5F33]" aria-invalid={!!errors.consent} />
          I agree that UNO SUJATA may contact me about this request, and may keep these details to reply.
        </label>
        {errors.consent && <p role="alert" className="mt-1 font-body text-[11px] text-red-800">{errors.consent}</p>}
      </div>
      <p className="font-body text-[11px] leading-relaxed text-ink/65">Your details are used only to reply to this request. Drawings can be sent from the full quotation form.</p>
      {serverError && <p role="alert" className="border border-red-900/30 bg-red-50 p-3 font-body text-xs text-red-900">{serverError}</p>}
      <button type="submit" disabled={busy} className="btn-primary w-full !min-h-11 disabled:opacity-60">{busy ? "Sending…" : "Send request"}</button>
    </form>
  );
}
