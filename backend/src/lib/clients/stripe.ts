import Stripe from "stripe";
import { readStripeEnv } from "../config";
import { AppError } from "../errors";
import { logger } from "../logger";

const STRIPE_TIMEOUT_MS = 20_000;
const STRIPE_MAX_RETRIES = 2;

let cached: { key: string; client: Stripe } | null = null;

function notConfigured(message: string): AppError {
  return new AppError(503, message);
}

/**
 * The shared Stripe client. Stripe is optional, so the env is read on first
 * use: a missing or wrong-mode key gives a 503 instead of stopping the server.
 */
export function getStripe(): Stripe {
  const env = readStripeEnv();
  const secretKey = env.STRIPE_SECRET_KEY;
  const mode = (env.STRIPE_MODE || (env.NODE_ENV === "production" ? "live" : "demo"))
    .trim()
    .toLowerCase();

  if (!secretKey) {
    throw notConfigured("Stripe is not configured on the server.");
  }

  const expectedPrefix =
    mode === "demo" ? "sk_test_" : mode === "live" ? "sk_live_" : null;

  if (!expectedPrefix) {
    throw notConfigured("STRIPE_MODE must be set to demo or live.");
  }

  if (!secretKey.startsWith(expectedPrefix)) {
    logger.error(
      { mode, keyPrefix: secretKey.slice(0, 8), keyLength: secretKey.length },
      "Stripe key mode mismatch"
    );

    throw notConfigured(
      mode === "demo"
        ? "Demo checkout requires a Stripe test secret key."
        : "Live checkout requires a Stripe live secret key."
    );
  }

  if (!cached || cached.key !== secretKey) {
    cached = {
      key: secretKey,
      client: new Stripe(secretKey, {
        timeout: STRIPE_TIMEOUT_MS,
        maxNetworkRetries: STRIPE_MAX_RETRIES,
      }),
    };
  }

  return cached.client;
}

export function getWebhookSecret(): string | undefined {
  return readStripeEnv().STRIPE_WEBHOOK_SECRET;
}

export function getFrontendUrl(): string {
  const env = readStripeEnv();
  const configuredUrl = env.FRONTEND_URL || env.CLIENT_URL?.split(",")[0]?.trim();

  if (!configuredUrl) {
    throw new Error("FRONTEND_URL or CLIENT_URL must be configured.");
  }

  return configuredUrl.replace(/\/+$/, "");
}
