import crypto from "node:crypto";
import { insightsHashSecret } from "../../lib/config";

/** Crawlers, link previews, uptime checks and scripted clients. */
const BOT_PATTERN =
  /bot|crawl|spider|slurp|scrape|headless|lighthouse|pingdom|uptime|monitor|facebookexternalhit|embedly|whatsapp|curl|wget|python|java\/|okhttp|go-http-client|node-fetch|axios|undici|httpclient|libwww|phantomjs|puppeteer|playwright|selenium/i;

/** True for an empty user agent or one that looks automated. */
export function isBot(userAgent: string | undefined | null): boolean {
  const ua = (userAgent ?? "").trim();
  return ua === "" || BOT_PATTERN.test(ua);
}

/** The UTC calendar day, "YYYY-MM-DD". */
export function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export type VisitorInput = {
  day: string;
  portfolioId: string;
  ip: string;
  userAgent: string;
};

/**
 * HMAC-SHA256(secret, day|portfolioId|ip|ua). The day is part of the input,
 * so the same person gets a new hash every day and cannot be followed over
 * time. The IP and user agent are only used here and never stored.
 */
export function hashVisitor(input: VisitorInput, secret: string = insightsHashSecret()): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${input.day}|${input.portfolioId}|${input.ip}|${input.userAgent}`)
    .digest("hex");
}
