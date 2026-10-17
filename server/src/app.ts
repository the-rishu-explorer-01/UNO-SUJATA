import express from "express";
import cors from "cors";
import { apiRouter } from "./routes/index.js";
import { sitemapRouter } from "./routes/sitemap.js";
import { errorHandler, notFound } from "./middleware/error.js";
import { mediaDir } from "./services/media.service.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  // Baseline security headers for every response. The site's own CSP is set at the host or CDN,
  // because it depends on the final list of script and font origins.
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

  // Behind a reverse proxy, set TRUST_PROXY to the number of proxies so rate limits see the real client IP.
  app.set("trust proxy", Number(process.env.TRUST_PROXY ?? 0));

  // CORS: an explicit allowlist. Outside production with no list set, allow any origin for local development only.
  const allowlist = process.env.CORS_ORIGIN?.split(",").map((s) => s.trim()).filter(Boolean);
  const origin = allowlist?.length ? allowlist : process.env.NODE_ENV !== "production";
  app.use(
    cors({
      origin,
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Idempotency-Key", "X-RFQ-Token"],
      maxAge: 600,
    })
  );

  app.use(express.json({ limit: "100kb" }));

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Public product images only. The drawing store is never mounted here.
  app.use(
    "/media",
    express.static(mediaDir(), {
      dotfiles: "deny",
      index: false,
      maxAge: "1d",
      setHeaders: (res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
      },
    })
  );
  app.use(sitemapRouter);
  app.use("/api", apiRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
