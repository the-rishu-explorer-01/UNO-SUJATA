export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  /** Optional reply-to, e.g. the customer on internal notifications. */
  replyTo?: string;
}

/** Transport abstraction. Implementations: console (development) and SMTP (production). */
export interface EmailProvider {
  readonly name: string;
  send(email: OutgoingEmail): Promise<void>;
}
