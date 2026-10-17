import { useRef, useState, type ReactNode } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import DrawingUpload, { type UploadItem } from "@/components/rfq/DrawingUpload";
import ErrorBanner from "@/components/rfq/ErrorBanner";
import { api, ApiError, newIdempotencyKey, type RfqPayload } from "@/lib/api";
import { rfqFormSchema, type RfqFormValues } from "@/lib/schemas";
import { describeError, type DescribedError } from "@/lib/rfqErrors";

export interface ProductOption {
  slug: string;
  name: string;
  productCode: string | null;
  categoryName: string;
}

export interface Prefill {
  product: string;
  partNumber: string;
  categoryName: string;
}

interface Props {
  prefill: Prefill;
  products: ProductOption[];
  lookups: { industries: string[]; materials: string[]; applications: string[] };
}

const input =
  "mt-2 w-full border border-ink/40 bg-paper px-3 py-2.5 font-body text-base placeholder:text-ink/35 focus:border-ink focus:outline-none focus:ring-2 focus:ring-brass/60 aria-[invalid=true]:border-red-800";

/** Server field names that differ from the form's names. */
const SERVER_TO_FORM: Record<string, string> = { productSlugs: "product" };
const FORM_FIELDS = new Set<string>(Object.keys(rfqFormSchema.shape));

export default function RfqForm({ prefill, products, lookups }: Props) {
  const navigate = useNavigate();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<DescribedError | null>(null);
  // One key per form session. A retry after a network failure reuses it, so the server never creates two RFQs.
  const idempotencyKey = useRef(newIdempotencyKey());
  // The part number follows the selected product only while the customer has not typed their own value.
  const autoCode = useRef(prefill.partNumber);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    getValues,
    watch,
    formState: { errors },
  } = useForm<RfqFormValues>({
    resolver: zodResolver(rfqFormSchema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      company: "",
      email: "",
      phone: "",
      country: "",
      industry: "",
      product: prefill.product,
      partNumber: prefill.partNumber,
      quantity: "",
      material: "",
      finish: "",
      application: "",
      deliveryRequirement: "",
      message: "",
      consent: false as unknown as true,
      website: "",
    },
  });

  const selectedSlug = watch("product");
  const selected = products.find((p) => p.slug === selectedSlug);
  const categoryName = selected?.categoryName ?? (selectedSlug ? prefill.categoryName : "");

  const uploading = items.some((i) => i.status === "uploading");
  const failedFiles = items.some((i) => i.status === "error");

  function applyServerFields(fields: Record<string, string[]>) {
    for (const [key, messages] of Object.entries(fields)) {
      const name = SERVER_TO_FORM[key] ?? key;
      // Errors about things the customer cannot edit here (such as an expired file) are shown in the banner instead.
      if (!FORM_FIELDS.has(name) || !messages?.[0]) continue;
      setError(name as FieldPath<RfqFormValues>, { type: "server", message: messages[0] });
    }
  }

  async function onValid(values: RfqFormValues) {
    setBanner(null);
    if (uploading) {
      setBanner({ kind: "upload", title: "Please wait", message: "Your files are still uploading. Submit when they finish.", retryable: false });
      return;
    }
    if (failedFiles) {
      setBanner({ kind: "invalid-file", title: "Remove files that could not be added", message: "Remove or retry the files marked below, then submit again.", retryable: false });
      return;
    }

    const payload: RfqPayload = {
      name: values.name,
      company: values.company,
      email: values.email,
      phone: values.phone,
      country: values.country,
      industry: values.industry || undefined,
      productSlugs: values.product ? [values.product] : [],
      partNumber: values.partNumber || undefined,
      quantity: values.quantity || undefined,
      material: values.material || undefined,
      finish: values.finish || undefined,
      application: values.application || undefined,
      deliveryRequirement: values.deliveryRequirement || undefined,
      message: values.message,
      attachmentIds: items.flatMap((i) => (i.status === "done" && i.serverId ? [i.serverId] : [])),
      consent: true,
      website: values.website || undefined,
    };

    setSending(true);
    try {
      const res = await api.submitRfq(payload, idempotencyKey.current);
      navigate("/request-quote/success", { state: { rfqNumber: res.rfqNumber, submittedAt: res.submittedAt } });
    } catch (err) {
      if (err instanceof ApiError && err.fields) applyServerFields(err.fields);
      setBanner(describeError(err, "submit"));
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-12" aria-label="Request for quotation">
      {/* Honeypot: hidden from people, often filled by bots. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>
          Leave this field empty
          <input type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>

      {banner && <ErrorBanner error={banner} onRetry={banner.retryable ? () => handleSubmit(onValid)() : undefined} />}

      <FormSection number="01" title="Contact">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="name" label="Full name" error={errors.name?.message}>
            <input id="name" autoComplete="name" aria-invalid={!!errors.name} className={input} {...register("name")} />
          </Field>
          <Field id="company" label="Company" error={errors.company?.message}>
            <input id="company" autoComplete="organization" aria-invalid={!!errors.company} className={input} {...register("company")} />
          </Field>
          <Field id="email" label="Business email" error={errors.email?.message}>
            <input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!errors.email} className={input} {...register("email")} />
          </Field>
          <Field id="phone" label="Phone" error={errors.phone?.message}>
            <input id="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" aria-invalid={!!errors.phone} className={input} {...register("phone")} />
          </Field>
          <Field id="country" label="Country" error={errors.country?.message}>
            <input id="country" autoComplete="country-name" aria-invalid={!!errors.country} className={input} {...register("country")} />
          </Field>
          <Field id="industry" label="Industry" error={errors.industry?.message}>
            <input id="industry" list="industry-options" autoComplete="off" placeholder="e.g. Electrical" className={input} {...register("industry")} />
            <datalist id="industry-options">
              {lookups.industries.map((n) => <option key={n} value={n} />)}
            </datalist>
          </Field>
        </div>
      </FormSection>

      <FormSection number="02" title="Product">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="product" label="Product" error={errors.product?.message} hint="Pre-filled from the page you came from. Change it if needed.">
            <select
              id="product"
              className={input}
              {...register("product", {
                onChange: (e) => {
                  const next = products.find((p) => p.slug === e.target.value);
                  const current = getValues("partNumber");
                  // Only replace the part number if it still holds the previous product's code.
                  if (!current || current === autoCode.current) {
                    setValue("partNumber", next?.productCode ?? "", { shouldDirty: true });
                    autoCode.current = next?.productCode ?? "";
                  }
                },
              })}
            >
              <option value="">Not in the catalogue, or not sure</option>
              {products.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </Field>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-technical text-ink/70">Category</p>
            <p className="mt-2 border-b border-ink/20 py-2.5 font-body text-base text-ink/75" aria-live="polite">
              {categoryName || "Follows the product you choose"}
            </p>
          </div>

          <Field id="partNumber" label="Part number or product code" error={errors.partNumber?.message} hint="Your own part number, or the catalogue code if you have it.">
            <input id="partNumber" autoComplete="off" aria-invalid={!!errors.partNumber} className={input} {...register("partNumber")} />
          </Field>
        </div>
      </FormSection>

      <FormSection number="03" title="Specification">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="quantity" label="Quantity" error={errors.quantity?.message} hint="For example 5,000 per month, or a prototype run of 20.">
            <input id="quantity" autoComplete="off" className={input} {...register("quantity")} />
          </Field>
          <Field id="material" label="Material" error={errors.material?.message}>
            <input id="material" list="material-options" autoComplete="off" placeholder="e.g. Brass" className={input} {...register("material")} />
            <datalist id="material-options">
              {lookups.materials.map((n) => <option key={n} value={n} />)}
            </datalist>
          </Field>
          <Field id="finish" label="Required finish" error={errors.finish?.message}>
            <input id="finish" autoComplete="off" placeholder="e.g. Nickel plated, or as per drawing" className={input} {...register("finish")} />
          </Field>
          <Field id="application" label="Application" error={errors.application?.message}>
            <input id="application" list="application-options" autoComplete="off" className={input} {...register("application")} />
            <datalist id="application-options">
              {lookups.applications.map((n) => <option key={n} value={n} />)}
            </datalist>
          </Field>
          <Field id="deliveryRequirement" label="Target delivery" error={errors.deliveryRequirement?.message} hint="For example 6 weeks, or a date.">
            <input id="deliveryRequirement" autoComplete="off" className={input} {...register("deliveryRequirement")} />
          </Field>
        </div>
      </FormSection>

      <FormSection number="04" title="Requirement">
        <Field id="message" label="Additional requirements" error={errors.message?.message} hint="Describe the part, its function, tolerances, testing or certification needs, and anything else we should know.">
          <textarea id="message" rows={6} aria-invalid={!!errors.message} className={input} {...register("message")} />
        </Field>
      </FormSection>

      <FormSection number="05" title="Drawings and samples" hint="Optional. Attach a drawing, sample photo or specification.">
        <DrawingUpload items={items} setItems={setItems} />
      </FormSection>

      <div className="space-y-6 border-t border-ink pt-10">
        <label className="flex cursor-pointer items-start gap-3 font-body text-sm leading-relaxed">
          <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#7D5F33]" aria-invalid={!!errors.consent} {...register("consent")} />
          <span>
            I agree that UNO SUJATA may contact me about this request and store the details I have provided.
          </span>
        </label>
        {errors.consent?.message && <p role="alert" className="font-body text-xs text-red-800">{errors.consent.message}</p>}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <button type="submit" disabled={sending || uploading} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">
            {sending ? (<><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Sending…</>) : "Request a Quote"}
          </button>
          <p className="font-body text-xs text-ink/65">
            {uploading ? "Waiting for uploads to finish…" : "You will receive a reference number straight away."}
          </p>
        </div>
      </div>
    </form>
  );
}

function FormSection({ number, title, hint, children }: { number: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`section-${number}`}>
      <div className="mb-6 flex items-baseline gap-4 border-b border-line pb-3">
        <span className="font-mono text-[11px] text-brass-deep">{number}</span>
        <h2 id={`section-${number}`} className="font-display text-2xl font-bold">{title}</h2>
      </div>
      {hint && <p className="-mt-2 mb-6 font-body text-sm text-ink/60">{hint}</p>}
      {children}
    </section>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block font-mono text-[11px] uppercase tracking-technical text-ink/70">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 font-body text-xs text-ink/65">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="mt-1.5 font-body text-xs text-red-800">{error}</p>}
    </div>
  );
}
