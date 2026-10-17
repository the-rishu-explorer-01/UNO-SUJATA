import { createApp } from "./app.js";
import { prisma } from "./utils/prisma.js";
import { ensureUploadDir } from "./services/storage.js";
import { cleanupExpiredUploads } from "./services/rfq.service.js";
import { ensureMediaDir } from "./services/media.service.js";
import { purgeSessions } from "./services/auth.service.js";

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

await ensureUploadDir();
await ensureMediaDir();

const server = app.listen(port, () => {
  console.log(`[api] UNO SUJATA API listening on http://localhost:${port}`);
});

// Remove abandoned uploads every hour. unref() so this timer never keeps the process alive.
const cleanup = setInterval(() => {
  cleanupExpiredUploads()
    .then((n) => n && console.log(`[cleanup] removed ${n} expired upload(s)`))
    .catch((err) => console.error("[cleanup] failed:", err instanceof Error ? err.message : err));
}, 60 * 60 * 1000);
cleanup.unref();

// Drop expired and revoked admin sessions, so the table does not grow without bound.
const sessionCleanup = setInterval(() => {
  purgeSessions().catch((err) => console.error("[cleanup] sessions:", err instanceof Error ? err.message : err));
}, 60 * 60 * 1000);
sessionCleanup.unref();

async function shutdown(signal: string) {
  console.log(`[api] ${signal} received, shutting down`);
  clearInterval(cleanup);
  clearInterval(sessionCleanup);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
