import { Link, useLocation } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import Seo from "@/components/Seo";

interface SuccessState {
  rfqNumber: string;
  submittedAt: string;
}

/** Shown after a successful submission. Reads the reference from navigation state, never from the URL. */
export default function RfqSuccessPage() {
  const location = useLocation();
  const state = (location.state ?? null) as SuccessState | null;
  const valid = !!state?.rfqNumber && /^RFQ-SUJ-\d{4}-\d{5,}$/.test(state.rfqNumber);

  const submitted = valid && state?.submittedAt
    ? new Date(state.submittedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <>
      <Seo title="Request received | UNO SUJATA" description="Your request for quotation has been received." path="/request-quote/success" indexable={false} />

      <section className="bg-bone py-20 lg:py-28">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <CheckCircle2 size={40} className="text-emerald-800" aria-hidden="true" />
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.02] sm:text-6xl">
              Your requirement has been received.
            </h1>

            {valid && state ? (
              <>
                <div className="mt-10 border border-ink bg-paper p-6 sm:p-8">
                  <p className="eyebrow !text-[10px]">RFQ reference</p>
                  <p className="mt-3 break-all font-mono text-2xl font-medium tracking-wide sm:text-3xl" aria-label={`Reference ${state.rfqNumber}`}>
                    {state.rfqNumber}
                  </p>
                  {submitted && <p className="mt-3 font-body text-sm text-ink/60">Submitted {submitted}</p>}
                </div>
                <p className="mt-8 max-w-xl font-body text-base leading-relaxed text-ink/75">
                  Keep this reference for any follow-up. We have sent a confirmation to the email address you gave, with the same number.
                </p>
              </>
            ) : (
              <p className="mt-8 max-w-xl font-body text-base leading-relaxed text-ink/75">
                If you submitted the form, your request is with our team. We have sent a confirmation to your email address. If it does not arrive within a few minutes, check your spam folder, or email info@sujatabrass.com.
              </p>
            )}
          </div>

          <aside className="lg:col-span-4 lg:col-start-9">
            <p className="eyebrow">Next step</p>
            <p className="mt-4 font-body text-base leading-relaxed text-ink/75">
              Our engineering and sales team reviews your requirement and replies by email. If we need a drawing or more detail, we will ask in that reply.
            </p>
            <div className="mt-10 flex flex-col gap-3">
              <Link to="/products" className="btn-primary">Explore Products</Link>
              <Link to="/" className="btn-ghost">Back to home</Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
