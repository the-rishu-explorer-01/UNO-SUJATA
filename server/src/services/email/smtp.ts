import nodemailer from "nodemailer";
import type { EmailProvider, OutgoingEmail } from "./types.js";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
}

/** SMTP provider. Credentials are passed in from environment variables, never written in code. */
export function smtpProvider(cfg: SmtpConfig): EmailProvider {
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
  });
  return {
    name: "smtp",
    async send(email: OutgoingEmail) {
      await transport.sendMail({
        from: cfg.from,
        to: email.to,
        replyTo: email.replyTo,
        subject: email.subject,
        text: email.text,
      });
    },
  };
}
