import { consoleProvider } from "./console.js";
import { smtpProvider } from "./smtp.js";
import type { EmailProvider, OutgoingEmail } from "./types.js";
import { customerConfirmation, internalNotification, type RfqEmailData } from "./templates.js";

export type { EmailProvider, OutgoingEmail, RfqEmailData };

/** Chooses the provider from EMAIL_PROVIDER. Defaults to console so a missing config never sends mail by accident. */
export function createEmailProvider(env: NodeJS.ProcessEnv = process.env): EmailProvider {
  if ((env.EMAIL_PROVIDER ?? "console") === "smtp") {
    const host = env.SMTP_HOST;
    if (!host) throw new Error("EMAIL_PROVIDER=smtp requires SMTP_HOST");
    return smtpProvider({
      host,
      port: Number(env.SMTP_PORT ?? 587),
      secure: env.SMTP_SECURE === "true",
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from: env.MAIL_FROM ?? "UNO SUJATA <no-reply@example.com>",
    });
  }
  return consoleProvider;
}

/**
 * Sends the customer confirmation and the internal notification.
 * Failures are logged and never thrown: the RFQ is already saved, and the customer's submission must not fail because mail failed.
 */
export async function sendRfqEmails(provider: EmailProvider, rfq: RfqEmailData, env: NodeJS.ProcessEnv = process.env) {
  const siteName = "UNO SUJATA";
  const internalTo = env.RFQ_NOTIFY_EMAIL;

  const jobs: Promise<void>[] = [
    provider.send(customerConfirmation(rfq, siteName)).catch((err) => log("customer", rfq.rfqNumber, err)),
  ];
  if (internalTo) {
    jobs.push(provider.send(internalNotification(rfq, internalTo)).catch((err) => log("internal", rfq.rfqNumber, err)));
  } else {
    console.warn(`[email] RFQ_NOTIFY_EMAIL is not set; internal notification skipped for ${rfq.rfqNumber}`);
  }
  await Promise.all(jobs);
}

function log(kind: string, rfqNumber: string, err: unknown) {
  // Log the reason without addresses or message content.
  console.error(`[email] ${kind} email failed for ${rfqNumber}:`, err instanceof Error ? err.message : "unknown error");
}
