import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, FileUp, Loader2, Mail, MapPin, Phone } from "lucide-react";
import Seo from "@/components/Seo";
import Breadcrumbs from "@/components/site/Breadcrumbs";
import PageHero from "@/components/site/PageHero";
import Reveal from "@/components/site/Reveal";
import { api, ApiError } from "@/lib/api";
import { usePublicContent } from "@/hooks/usePublicContent";
import { company } from "@/data/company";
import { SITE_BASE } from "@/data/pages";

const enquirySchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.string().trim().max(254).email("Enter a valid email"),
  company: z.string().trim().max(160).optional(),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters)").max(3000),
  website: z.string().max(0).optional(), // honeypot
});
type EnquiryValues = z.infer<typeof enquirySchema>;

const input =
  "mt-2 w-full border border-ink/40 bg-paper px-3 py-2.5 font-body text-base focus:border-ink focus:outline-none focus:ring-2 focus:ring-brass/60 aria-[invalid=true]:border-red-800";

export default function ContactPage() {
  const content = usePublicContent();
  const contact = content?.contact ?? {
    phone: company.phone,
    email: company.email,
    address: company.address,
    hours: "",
  };
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const { register, handleSubmit, setError, formState: { errors } } = useForm<EnquiryValues>({
    resolver: zodResolver(enquirySchema),
    defaultValues: { name: "", email: "", company: "", message: "", website: "" },
  });

  const onSubmit = async (values: EnquiryValues) => {
    setStatus("sending");
    setServerMessage(null);
    try {
      await api.sendContact({ name: values.name, email: values.email, company: values.company || undefined, message: values.message, website: values.website || undefined });
      setStatus("done");
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        for (const [key, msgs] of Object.entries(err.fields)) {
          if (msgs[0] && ["name", "email", "company", "message"].includes(key)) {
            setError(key as keyof EnquiryValues, { type: "server", message: msgs[0] });
          }
        }
      }
      if (err instanceof ApiError && err.status === 429) setServerMessage(err.message);
      else if (err instanceof ApiError && err.status >= 500) setServerMessage("We could not send your message. Please try again in a moment, or email us directly.");
      else if (err instanceof ApiError && err.status === 0) setServerMessage("We could not reach the server. Check your connection and try again.");
      setStatus("error");
    }
  };

  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`;

  return (
    <>
      <Seo
        title="Contact UNO SUJATA | Jamnagar, Gujarat | Request a Quote"
        description="Contact UNO SUJATA in Jamnagar, Gujarat. Phone, email and address, plus a business enquiry form. Request a quote or send your drawing."
        path="/contact"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "ContactPage",
            name: "Contact UNO SUJATA",
            url: `${SITE_BASE}/contact`,
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "UNO SUJATA",
            legalName: company.legalName,
            url: SITE_BASE,
            email: contact.email,
            telephone: contact.phone,
            address: { "@type": "PostalAddress", streetAddress: contact.address, addressLocality: "Jamnagar", addressRegion: "Gujarat", addressCountry: "IN" },
            contactPoint: { "@type": "ContactPoint", telephone: contact.phone, email: contact.email, contactType: "sales" },
          },
        ]}
      />
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Contact" }]} />
      <PageHero
        eyebrow="Contact"
        title="Start with the part."
        lead="Call, write, or send the enquiry below. For a quote, the drawing or specification speeds up our reply."
        actions={
          <>
            <Link to="/request-quote" className="btn-primary">Request a Quote <ArrowRight size={16} aria-hidden="true" /></Link>
            <Link to="/request-quote?type=drawing" className="btn-ghost"><FileUp size={16} aria-hidden="true" /> Send Your Drawing</Link>
          </>
        }
      />

      <section className="bg-paper py-20 lg:py-28">
        <div className="container-x grid gap-16 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="eyebrow">Company</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold">{company.brand}</h2>
            <p className="mt-1 font-body text-sm text-ink/60">{company.legalName}</p>

            <dl className="mt-10 space-y-8 font-body text-base">
              <div className="flex gap-4">
                <MapPin size={20} className="mt-1 shrink-0 text-brass-deep" aria-hidden="true" />
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-ink/65">Address</dt>
                  <dd className="mt-1.5 leading-relaxed">{contact.address}</dd>
                </div>
              </div>
              <div className="flex gap-4">
                <Phone size={20} className="mt-1 shrink-0 text-brass-deep" aria-hidden="true" />
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-ink/65">Phone</dt>
                  <dd className="mt-1.5"><a href={`tel:${contact.phone.replace(/[^+0-9]/g, "")}`} className="hover:text-brass-deep">{contact.phone}</a></dd>
                </div>
              </div>
              <div className="flex gap-4">
                <Mail size={20} className="mt-1 shrink-0 text-brass-deep" aria-hidden="true" />
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-ink/65">Email</dt>
                  <dd className="mt-1.5"><a href={`mailto:${contact.email}`} className="break-all hover:text-brass-deep">{contact.email}</a></dd>
                </div>
              </div>
              {contact.hours && (
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-wider text-ink/65">Hours</dt>
                  <dd className="mt-1.5">{contact.hours}</dd>
                </div>
              )}
            </dl>

            <div className="mt-12 border border-line bg-bone p-6">
              <div className="tech-grid flex aspect-[16/9] items-center justify-center border border-line bg-paper">
                <p className="font-mono text-[11px] uppercase tracking-technical text-ink/65">Map placeholder</p>
              </div>
              <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 font-body text-sm font-semibold uppercase tracking-wider hover:text-brass-deep">
                Open in Google Maps <ArrowRight size={14} aria-hidden="true" />
              </a>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="lg:col-span-6 lg:col-start-7">
            <p className="eyebrow">Business enquiry</p>
            <h2 className="mt-4 font-display text-3xl font-extrabold">Send us a message</h2>
            <p className="mt-3 font-body text-sm text-ink/65">For a quote with specifications, use the <Link to="/request-quote" className="underline underline-offset-4">quote form</Link>. It takes a drawing and records a reference number.</p>

            {status === "done" ? (
              <div role="status" className="mt-10 border border-ink p-8">
                <h3 className="font-display text-2xl font-bold">Thank you. Your message has been received.</h3>
                <p className="mt-3 font-body text-sm text-ink/70">We will reply to the email address you gave.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-10 space-y-6" aria-label="Business enquiry">
                <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
                  <label>Leave this field empty<input type="text" tabIndex={-1} autoComplete="off" {...register("website")} /></label>
                </div>

                {serverMessage && <p role="alert" className="border border-red-900/40 bg-red-50 p-4 font-body text-sm text-red-900">{serverMessage}</p>}

                <div className="grid gap-6 sm:grid-cols-2">
                  <Field id="name" label="Full name" error={errors.name?.message}>
                    <input id="name" autoComplete="name" aria-invalid={!!errors.name} className={input} {...register("name")} />
                  </Field>
                  <Field id="email" label="Business email" error={errors.email?.message}>
                    <input id="email" type="email" autoComplete="email" aria-invalid={!!errors.email} className={input} {...register("email")} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field id="company" label="Company (optional)" error={errors.company?.message}>
                      <input id="company" autoComplete="organization" aria-invalid={!!errors.company} className={input} {...register("company")} />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field id="message" label="Message" error={errors.message?.message}>
                      <textarea id="message" rows={6} aria-invalid={!!errors.message} className={input} {...register("message")} />
                    </Field>
                  </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <button type="submit" disabled={status === "sending"} className="btn-primary disabled:opacity-60">
                    {status === "sending" ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> Sending…</> : "Send message"}
                  </button>
                  <p className="font-body text-xs text-ink/65">We use your details only to reply to this enquiry.</p>
                </div>
              </form>
            )}
          </Reveal>
        </div>
      </section>
    </>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block font-mono text-[11px] uppercase tracking-technical text-ink/70">{label}</label>
      {children}
      {error && <p role="alert" className="mt-1.5 font-body text-xs text-red-800">{error}</p>}
    </div>
  );
}
