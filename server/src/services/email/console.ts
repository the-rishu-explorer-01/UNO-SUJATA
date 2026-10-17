import type { EmailProvider, OutgoingEmail } from "./types.js";

/** Development provider: prints the email instead of sending it. Never used in production. */
export const consoleProvider: EmailProvider = {
  name: "console",
  async send(email: OutgoingEmail) {
    console.log(`[email:console] to=${email.to} subject="${email.subject}"`);
  },
};
