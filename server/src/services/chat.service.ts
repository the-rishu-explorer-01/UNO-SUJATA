import { productService } from "./product.service.js";
import { classifyIntent, extractKeywords, fallbackReply, suggestionsFor, toCard, toGrounding, SYSTEM_PROMPT, type ChatIntent, type ChatProductRecord } from "../lib/chatLogic.js";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatAnswer {
  reply: string;
  intent: ChatIntent;
  products: ReturnType<typeof toCard>[];
  suggestions: string[];
  aiUsed: boolean;
}

/** Searches only published products, using the same search the public catalogue uses. */
async function searchProducts(text: string): Promise<ChatProductRecord[]> {
  const keywords = extractKeywords(text);
  const seen = new Map<string, ChatProductRecord>();
  for (const k of keywords) {
    const res = await productService.list({ search: k, page: 1, limit: 4 });
    for (const item of res.items) {
      if (!seen.has(item.slug)) seen.set(item.slug, item as unknown as ChatProductRecord);
    }
    if (seen.size >= 4) break;
  }
  return [...seen.values()].slice(0, 4);
}

/**
 * Calls an OpenAI-compatible chat endpoint if CHAT_AI_URL, CHAT_AI_KEY and CHAT_AI_MODEL are set.
 * Returns null on any failure, and the caller falls back. Message contents are never logged.
 */
async function callAi(history: ChatTurn[], records: ReturnType<typeof toGrounding>[]): Promise<string | null> {
  const url = process.env.CHAT_AI_URL;
  const key = process.env.CHAT_AI_KEY;
  const model = process.env.CHAT_AI_MODEL;
  if (!url || !key || !model) return null;

  const system = `${SYSTEM_PROMPT}\n\nPRODUCT RECORDS:\n${JSON.stringify(records)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 300,
        messages: [{ role: "system", content: system }, ...history.slice(-6).map((m) => ({ role: m.role, content: m.content }))],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[chat] AI provider returned HTTP ${res.status}; using fallback`);
      return null;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const text = data.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim().slice(0, 1500) : null;
  } catch (err) {
    console.error("[chat] AI provider unavailable; using fallback:", err instanceof Error ? err.name : "error");
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function answerChat(history: ChatTurn[]): Promise<ChatAnswer> {
  const last = history[history.length - 1].content;
  const intent = classifyIntent(last);
  const products = intent === "greeting" ? [] : await searchProducts(last);
  const aiText = await callAi(history, products.map(toGrounding));
  return {
    reply: aiText ?? fallbackReply(intent, products.length),
    intent,
    products: products.map(toCard),
    suggestions: suggestionsFor(intent),
    aiUsed: aiText !== null,
  };
}
