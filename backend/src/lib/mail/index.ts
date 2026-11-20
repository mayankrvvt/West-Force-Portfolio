import { Resend } from "resend";
import { logger } from "../logger";

export { siteUrl } from "./layout";
export * from "./templates";

export type MailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
};

export type MailResult = {
  mode: "live" | "pretend";
  /** Addresses Resend accepted (live), or that would have been sent to (pretend). */
  sent: number;
  /** Addresses left out because they are not on MAIL_ALLOWLIST. */
  skipped: number;
};

type MailSettings =
  | { mode: "pretend" }
  | { mode: "live"; apiKey: string; from: string; allowlist: Set<string> | null };

const normalise = (email: string) => email.trim().toLowerCase();

/**
 * Read at send time, so tests and scripts see the current env.
 * Live only when MAIL_MODE=live, RESEND_API_KEY and MAIL_FROM are all set,
 * and never when NODE_ENV=test.
 */
export function mailSettings(env: NodeJS.ProcessEnv = process.env): MailSettings {
  if (env.NODE_ENV === "test") return { mode: "pretend" };
  if (env.MAIL_MODE?.trim().toLowerCase() !== "live") return { mode: "pretend" };

  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.MAIL_FROM?.trim();
  if (!apiKey || !from) {
    logger.warn("MAIL_MODE is live but RESEND_API_KEY or MAIL_FROM is missing; mail is not sent");
    return { mode: "pretend" };
  }

  const list = (env.MAIL_ALLOWLIST ?? "").split(",").map(normalise).filter(Boolean);
  return { mode: "live", apiKey, from, allowlist: list.length ? new Set(list) : null };
}

/**
 * True when sendMail would really send to this address: live mode and, when
 * MAIL_ALLOWLIST is set, the address is on it. Account emails use this to
 * pick between our Resend email and Firebase's own email (the fallback).
 */
export function mailReaches(email: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const settings = mailSettings(env);
  if (settings.mode !== "live") return false;
  return settings.allowlist ? settings.allowlist.has(normalise(email)) : true;
}

let client: { key: string; resend: Resend } | null = null;

function resendFor(apiKey: string): Resend {
  if (client?.key !== apiKey) client = { key: apiKey, resend: new Resend(apiKey) };
  return client.resend;
}

/**
 * Send one email to each address (never one email with everyone on the To
 * line). Logs only the subject and counts: never addresses, links or keys.
 * Throws when Resend rejects a send.
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  const recipients = [...new Set((Array.isArray(message.to) ? message.to : [message.to]).map(normalise).filter(Boolean))];
  const settings = mailSettings();

  if (settings.mode === "pretend") {
    logger.info({ subject: message.subject, recipients: recipients.length }, "Mail not sent (pretend mode)");
    return { mode: "pretend", sent: recipients.length, skipped: 0 };
  }

  const allowed = settings.allowlist
    ? recipients.filter((email) => settings.allowlist?.has(email))
    : recipients;
  const skipped = recipients.length - allowed.length;

  if (skipped > 0) {
    logger.info({ subject: message.subject, skipped }, "Mail skipped for addresses not on MAIL_ALLOWLIST");
  }

  const resend = resendFor(settings.apiKey);
  let sent = 0;

  for (const to of allowed) {
    const { error } = await resend.emails.send({
      from: settings.from,
      to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (error) {
      logger.error({ subject: message.subject, reason: error.name, status: error.statusCode }, "Mail send failed");
      throw new Error(`Mail send failed (${error.name}).`);
    }
    sent += 1;
  }

  logger.info({ subject: message.subject, recipients: sent, skipped }, "Mail sent");
  return { mode: "live", sent, skipped };
}
