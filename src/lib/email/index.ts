import "server-only";
import { Resend } from "resend";
import { getEnv, isConfigured } from "@/lib/env";
import { renderEmail, type EmailTemplate } from "./templates";

export type SendResult = { delivered: boolean; reason?: string };

let client: Resend | undefined;

/**
 * Send a transactional email.
 * - With RESEND_API_KEY: delivered through Resend.
 * - Without it in development/test: printed to the server console so flows stay testable.
 * - Without it in production: not delivered; an error is logged (health check flags it).
 */
export async function sendEmail(to: string, template: EmailTemplate): Promise<SendResult> {
  const env = getEnv();
  const { subject, html, text } = renderEmail(template);

  if (!isConfigured("email", env)) {
    if (env.NODE_ENV === "production") {
      console.error(`[email] RESEND_API_KEY missing — could not send "${subject}".`);
      return { delivered: false, reason: "email_not_configured" };
    }
    console.info(`\n[email:dev] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return { delivered: false, reason: "logged_to_console" };
  }

  client ??= new Resend(env.RESEND_API_KEY);
  const { error } = await client.emails.send({ from: env.EMAIL_FROM, to, subject, html, text });
  if (error) {
    console.error(`[email] Resend error for "${subject}":`, error.message);
    return { delivered: false, reason: error.message };
  }
  return { delivered: true };
}
