import rateLimit from "express-rate-limit";

const common = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
};

/** Form submissions: tight, because each one sends email and creates a record. */
export const submitLimiter = rateLimit({
  ...common,
  limit: Number(process.env.RFQ_SUBMIT_LIMIT ?? 10),
  message: { error: "Too many requests. Please wait a few minutes and try again." },
});

/** File uploads: looser, because one enquiry can include several drawings. */
export const uploadLimiter = rateLimit({
  ...common,
  limit: Number(process.env.RFQ_UPLOAD_LIMIT ?? 60),
  message: { error: "Too many uploads. Please wait a few minutes and try again." },
});

/** Status lookups: generous for humans, tight enough to slow token guessing. */
export const lookupLimiter = rateLimit({
  ...common,
  limit: Number(process.env.RFQ_LOOKUP_LIMIT ?? 60),
  message: { error: "Too many requests. Please wait a few minutes and try again." },
});

/** All administration routes, per IP. Generous for staff; stops scripted abuse. */
export const adminLimiter = rateLimit({
  ...common,
  limit: Number(process.env.ADMIN_LIMIT ?? 600),
  message: { error: "Too many requests. Please wait a few minutes and try again." },
});

/** Admin sign-in per IP. Per-account lockout is applied separately in the auth service. */
export const adminLoginLimiter = rateLimit({
  ...common,
  limit: Number(process.env.ADMIN_LOGIN_LIMIT ?? 10),
  message: { error: "Too many sign-in attempts. Please wait a few minutes and try again." },
});

/** Public contact form. */
export const contactLimiter = rateLimit({
  ...common,
  limit: Number(process.env.CONTACT_LIMIT ?? 10),
  message: { error: "Too many messages. Please wait a few minutes and try again." },
});

/** Search: typing fires requests after a pause, so allow a generous rate per minute per IP. */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.SEARCH_LIMIT ?? 120),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many searches. Please wait a moment." },
});

/** Chatbot: per IP. Each message can trigger a product search and possibly a paid AI request. */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.CHAT_LIMIT ?? 20),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "You have sent many messages in a short time. Please wait a moment and try again." },
});
