import type { Role } from "../lib/permissions.js";

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth. Never trusted from the client. */
      admin?: { id: string; email: string; name: string; role: Role; sessionId: string };
    }
  }
}

export {};
