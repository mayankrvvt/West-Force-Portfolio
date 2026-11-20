import { toText } from "../lib/text";

/*
 * How many proxies sit in front of the app. Browsers reach Render through
 * the Vercel rewrite, so the default is 2 (Vercel + Render). Set
 * TRUST_PROXY_HOPS to a whole number >= 0 to change it.
 */
export const DEFAULT_TRUST_PROXY_HOPS = 2;

export function parseTrustProxyHops(value: unknown): number {
  const text = toText(value).trim();

  if (!/^\d+$/.test(text)) {
    return DEFAULT_TRUST_PROXY_HOPS;
  }

  return Number(text);
}
