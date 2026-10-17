import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MessageSquare, Send, X } from "lucide-react";
import { api, ApiError, type ChatCard, type ChatReply } from "@/lib/api";
import { company } from "@/data/company";
import QuoteRequestForm from "@/components/chat/QuoteRequestForm";

/**
 * UNO SUJATA Product Assistant. Bottom-right on public pages only.
 * Product answers come from the server, which searches the published catalogue.
 * Nothing typed here is stored in the browser or sent anywhere except the chat endpoint.
 */
type Message = {
  id: number;
  role: "user" | "assistant";
  text: string;
  time: Date;
  products?: ChatCard[];
  suggestions?: string[];
  links?: { label: string; to: string }[];
  error?: boolean;
};

const WELCOME =
  "Welcome to UNO SUJATA. Looking for a brass component or a custom-manufactured part? Tell me what you need, and I'll help you find the right solution.";

const QUICK = ["Explore Products", "Find a Brass Component", "Request a Quotation", "Custom Manufacturing", "Contact Sales"] as const;

let nextId = 1;
const msg = (role: Message["role"], text: string, extra: Partial<Message> = {}): Message => ({ id: nextId++, role, text, time: new Date(), ...extra });

const clock = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [msg("assistant", WELCOME, { suggestions: [...QUICK] })]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<"chat" | "quote">("chat");
  const [quoteProduct, setQuoteProduct] = useState<{ slug: string; name: string; code: string | null } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open && mode === "chat") inputRef.current?.focus();
  }, [open, mode]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const push = (m: Message) => setMessages((prev) => [...prev, m]);

  const openQuote = (product?: { slug: string; name: string; code: string | null }) => {
    setQuoteProduct(product ?? null);
    setMode("quote");
  };

  /** Quick actions that need no AI call are answered locally with fixed, factual text. */
  const localAnswer = (label: string): boolean => {
    if (label === "Explore Products") {
      push(msg("user", label));
      push(msg("assistant", "Our full catalogue is searchable by name, part number, category and material.", { links: [{ label: "Open the catalogue", to: "/products" }] }));
      return true;
    }
    if (label === "Request a Quotation") {
      push(msg("user", label));
      openQuote();
      return true;
    }
    if (label === "Find a Brass Component") {
      push(msg("user", label));
      push(msg("assistant", "Tell me the part you need: its name, part number, material, or application. For example: terminal, electrical pin, fuel jet, or grub screw."));
      return true;
    }
    if (label === "Contact Sales") {
      push(msg("user", label));
      push(msg("assistant", `Call ${company.phone} or email ${company.email}. You can also request a quotation here, and we will reply by email.`, { links: [{ label: "Contact page", to: "/contact" }] }));
      return true;
    }
    return false;
  };

  const send = async (raw: string) => {
    const text = raw.trim().slice(0, 500);
    if (!text || sending) return;
    if (QUICK.includes(text as (typeof QUICK)[number]) && localAnswer(text)) {
      setInput("");
      return;
    }

    const history = [...messages, msg("user", text)].filter((m) => !m.error).slice(-8);
    push(msg("user", text));
    setInput("");
    setSending(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res: ChatReply = await api.chat(
        history.map((m) => ({ role: m.role, content: m.text })),
        controller.signal
      );
      push(
        msg("assistant", res.reply, {
          products: res.products,
          suggestions: res.suggestions,
        })
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      const text = err instanceof ApiError && err.status === 429 ? err.message : "The assistant is unavailable right now. You can browse the catalogue, or request a quotation.";
      push(msg("assistant", text, { error: true, links: [{ label: "Browse products", to: "/products" }] }));
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="launcher"
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => setOpen(true)}
            aria-expanded={false}
            aria-controls="uno-chat-panel"
            className="fixed bottom-5 right-5 z-40 inline-flex min-h-12 items-center gap-2 bg-ink px-4 py-3 font-body text-sm font-semibold text-bone shadow-lg transition-colors duration-200 hover:bg-brass-deep focus-visible:outline-brass"
          >
            <MessageSquare size={18} aria-hidden="true" />
            <span>Product assistant</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.section
            key="panel"
            id="uno-chat-panel"
            role="dialog"
            aria-modal="false"
            aria-label="UNO SUJATA Product Assistant"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-50 flex flex-col bg-paper sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100vh-6rem))] sm:w-[400px] sm:border sm:border-ink sm:shadow-2xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-line bg-bone px-4 py-3">
              <div>
                <p className="font-display text-sm font-bold tracking-wide">UNO SUJATA Product Assistant</p>
                <p className="font-body text-xs text-ink/65">Answers use our published product information.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="inline-flex h-11 w-11 shrink-0 items-center justify-center hover:text-brass-deep">
                <X size={20} aria-hidden="true" />
              </button>
            </header>

            {mode === "quote" ? (
              <QuoteRequestForm
                product={quoteProduct}
                onBack={() => setMode("chat")}
                onSubmitted={(reference) => {
                  setMode("chat");
                  push(msg("assistant", `Your request has been received. Reference ${reference}. Keep this reference for any follow-up.`, { suggestions: ["Explore Products", "Contact Sales"] }));
                }}
              />
            ) : (
              <>
                <div ref={logRef} className="flex-1 space-y-5 overflow-y-auto px-4 py-4" role="log" aria-live="polite">
                  {messages.map((m) => (
                    <Bubble key={m.id} m={m} onSuggest={(s) => void send(s)} onQuote={(p) => openQuote(p)} />
                  ))}
                  {sending && (
                    <div className="flex items-center gap-1.5 px-1 text-ink/65" aria-label="Assistant is replying">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/50" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={onSubmit} className="border-t border-line p-3">
                  <label htmlFor="chat-input" className="sr-only">Describe the part you need</label>
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      id="chat-input"
                      value={input}
                      maxLength={500}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Describe the part or product you need"
                      autoComplete="off"
                      disabled={sending}
                      className="min-h-11 flex-1 border border-ink/40 bg-paper px-3 font-body text-sm placeholder:text-ink/50 focus:border-ink focus:outline-none focus:ring-2 focus:ring-brass/60"
                    />
                    <button type="submit" disabled={sending || !input.trim()} aria-label="Send message" className="inline-flex h-11 w-11 items-center justify-center bg-ink text-bone transition-colors duration-200 hover:bg-brass-deep disabled:opacity-40">
                      <Send size={16} aria-hidden="true" />
                    </button>
                  </div>
                  <p className="mt-2 font-body text-[11px] leading-relaxed text-ink/65">
                    Please don&apos;t share personal or financial details here. To request a quotation, use the quotation form, which asks only for the details we need to reply.
                  </p>
                </form>
              </>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({ m, onSuggest, onQuote }: { m: Message; onSuggest: (s: string) => void; onQuote: (p: { slug: string; name: string; code: string | null }) => void }) {
  const mine = m.role === "user";
  return (
    <div className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
      <div className={`max-w-[88%] px-3.5 py-2.5 font-body text-sm leading-relaxed ${mine ? "bg-ink text-bone" : m.error ? "border border-red-900/30 bg-red-50 text-red-900" : "border border-line bg-bone text-ink"}`}>
        {m.text}
      </div>
      {m.links && m.links.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {m.links.map((l) => (
            <Link key={l.to} to={l.to} className="inline-flex min-h-9 items-center gap-1.5 border border-ink/30 px-3 font-body text-xs font-semibold hover:border-ink">
              {l.label} <ArrowRight size={12} aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
      {m.products && m.products.length > 0 && (
        <ul className="mt-3 w-full max-w-[92%] space-y-2">
          {m.products.map((p) => (
            <li key={p.slug} className="border border-line bg-paper p-3">
              <div className="flex gap-3">
                {p.image && <img src={p.image.url} alt={p.image.alt} width={64} height={48} loading="lazy" className="h-12 w-16 shrink-0 object-cover" />}
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold leading-tight">{p.name}</p>
                  <p className="font-mono text-[10px] text-ink/65">{p.productCode ?? "Part number on request"} · {p.categoryName}</p>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 font-body text-xs text-ink/75">{p.description}</p>
              {p.materials.length > 0 && <p className="mt-1 font-body text-xs text-ink/70">Material: {p.materials.join(", ")}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={`/products/${p.slug}`} className="inline-flex min-h-9 items-center border border-ink px-3 font-body text-xs font-semibold hover:bg-ink hover:text-bone">View product</Link>
                <button type="button" onClick={() => onQuote({ slug: p.slug, name: p.name, code: p.productCode })} className="inline-flex min-h-9 items-center bg-brass px-3 font-body text-xs font-semibold text-ink hover:bg-brass-light">Request quotation</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {m.suggestions && m.suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {m.suggestions.map((s) => (
            <button key={s} type="button" onClick={() => onSuggest(s)} className="min-h-9 border border-ink/25 px-3 font-body text-xs hover:border-ink">{s}</button>
          ))}
        </div>
      )}
      <time dateTime={m.time.toISOString()} className="mt-1 font-mono text-[10px] text-ink/55">{clock(m.time)}</time>
    </div>
  );
}
