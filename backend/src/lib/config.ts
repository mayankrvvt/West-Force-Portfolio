import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// backend/ is two levels up from both src/lib and dist/lib.
export const BACKEND_ROOT = path.resolve(__dirname, "../..");
export const SERVICE_ACCOUNT_PATH = path.join(
  BACKEND_ROOT,
  "serviceAccountKey.json"
);

// Tests set their own fake env (see vitest.config.mjs) and must never load real secrets.
if (process.env.NODE_ENV !== "test") {
  dotenv.config({ path: path.join(BACKEND_ROOT, ".env"), quiet: true });
}

// Treat "" like "not set", the same way the old `process.env.X || default` code did.
const optionalText = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().optional()
);

const textWithDefault = (fallback: string) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? fallback : value),
    z.string()
  );

/** A whole number >= 0; empty or missing uses the fallback. */
const countWithDefault = (fallback: number) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? fallback : value),
    z.coerce.number().int().min(0)
  );

const DEV_CLIENT_URL = "http://localhost:5173";

const EnvSchema = z
  .object({
    NODE_ENV: optionalText,
    PORT: z.preprocess(
      (value) => (value === "" || value === undefined ? 5050 : value),
      z.coerce.number().int().min(0).max(65535)
    ),
    // Required in production; dev and tests fall back to the Vite dev server.
    CLIENT_URL: optionalText,
    TRUST_PROXY_HOPS: optionalText,
    LOG_LEVEL: optionalText,

    MONGODB_URI: optionalText,

    FIREBASE_SERVICE_ACCOUNT_JSON: optionalText,
    FIREBASE_PROJECT_ID: optionalText,
    FIREBASE_CLIENT_EMAIL: optionalText,
    FIREBASE_PRIVATE_KEY: optionalText,

    GEMINI_API_KEY: optionalText,
    GEMINI_CHAT_MODEL: textWithDefault("gemini-3.6-flash"),
    GEMINI_RESUME_MODEL: textWithDefault("gemini-3.6-flash"),
    // AI resume calls per user per UTC day. 0 turns the feature off.
    RESUME_BUILD_DAILY_LIMIT: countWithDefault(20),
    RESUME_ENHANCE_DAILY_LIMIT: countWithDefault(30),

    // Optional services. Their clients check what they need when first used.
    CLOUDINARY_URL: optionalText,
    CLOUDINARY_CLOUD_NAME: optionalText,
    CLOUDINARY_API_KEY: optionalText,
    CLOUDINARY_API_SECRET: optionalText,
    SUPABASE_URL: optionalText,
    SUPABASE_SECRET_KEY: optionalText,
    SUPABASE_ANON_KEY: optionalText,
    SUPABASE_VIDEO_BUCKET: textWithDefault("westforce-videos"),

    // Optional daily job collector (npm run jobs:collect). Without a Jooble key,
    // only the public Greenhouse and Lever boards are read.
    JOOBLE_API_KEY: optionalText,
    // "true" when only the job collector runs (e.g. GitHub Actions): it needs the
    // database but not Firebase, so the Firebase check below is skipped.
    JOBS_COLLECTOR_ONLY: optionalText,

    // Comma list of verified Firebase emails that may manage jobs at /admin/jobs.
    // Empty or unset means nobody is an admin.
    ADMIN_EMAILS: optionalText,

    // Portfolio view insights: HMAC key for the daily visitor hash.
    // Required in production (checked at startup below); dev and tests use a fixed default.
    INSIGHTS_HASH_SECRET: optionalText,

    // Signs document PIN access. Required in production (checked below).
    DOCUMENT_ACCESS_SECRET: optionalText,

    // Stripe stays optional, but production must never run in demo/test mode.
    STRIPE_MODE: optionalText,
    STRIPE_SECRET_KEY: optionalText,

    // Email (src/lib/mail). Mail is only sent when MAIL_MODE is "live" and the
    // Resend key and sender are set; otherwise it is logged and skipped.
    // Tests (NODE_ENV=test) never send.
    MAIL_MODE: optionalText,
    RESEND_API_KEY: optionalText,
    // Sender, e.g. "WestForce <hello@example.com>" on a domain verified in Resend.
    MAIL_FROM: optionalText,
    // Optional comma list: when set, live mail only goes to these addresses.
    MAIL_ALLOWLIST: optionalText,
    // Public site address for links and the logo in emails. Falls back to the
    // first CLIENT_URL origin.
    SITE_URL: optionalText,
  })
  .superRefine((env, ctx) => {
    // Only the variables the server already could not start without.
    if (env.NODE_ENV === "test") return;

    if (!env.MONGODB_URI) {
      ctx.addIssue({
        code: "custom",
        path: ["MONGODB_URI"],
        message: "MONGODB_URI is missing. Add it to backend/.env.",
      });
    }

    // Even collector-only jobs (the weekly digest) must not mail localhost links.
    if (
      env.NODE_ENV === "production" &&
      env.MAIL_MODE?.trim().toLowerCase() === "live" &&
      !env.SITE_URL?.trim() &&
      !env.CLIENT_URL?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["SITE_URL"],
        message: "SITE_URL (or CLIENT_URL) is missing. Live mail in production needs the public site address for links.",
      });
    }

    if (env.JOBS_COLLECTOR_ONLY === "true") return;

    if (env.NODE_ENV === "production") {
      if (!env.INSIGHTS_HASH_SECRET) {
        ctx.addIssue({
          code: "custom",
          path: ["INSIGHTS_HASH_SECRET"],
          message: "INSIGHTS_HASH_SECRET is missing. Set a long random string in production.",
        });
      }

      if (!env.CLIENT_URL) {
        ctx.addIssue({
          code: "custom",
          path: ["CLIENT_URL"],
          message: "CLIENT_URL is missing. Set the public frontend URL in production.",
        });
      }

      if (!env.DOCUMENT_ACCESS_SECRET) {
        ctx.addIssue({
          code: "custom",
          path: ["DOCUMENT_ACCESS_SECRET"],
          message: "DOCUMENT_ACCESS_SECRET is missing. Set a long random string in production.",
        });
      }

      if (env.STRIPE_MODE?.trim().toLowerCase() === "demo") {
        ctx.addIssue({
          code: "custom",
          path: ["STRIPE_MODE"],
          message: "STRIPE_MODE is demo. Production must use live (or leave it unset).",
        });
      }

      if (env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) {
        ctx.addIssue({
          code: "custom",
          path: ["STRIPE_SECRET_KEY"],
          message: "STRIPE_SECRET_KEY is a test key. Production needs a live key (sk_live_).",
        });
      }
    }

    const hasFirebaseTrio =
      env.FIREBASE_PROJECT_ID &&
      env.FIREBASE_CLIENT_EMAIL &&
      env.FIREBASE_PRIVATE_KEY;

    if (
      !env.FIREBASE_SERVICE_ACCOUNT_JSON &&
      !hasFirebaseTrio &&
      !fs.existsSync(SERVICE_ACCOUNT_PATH)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["FIREBASE_SERVICE_ACCOUNT_JSON"],
        message:
          "Firebase Admin credentials are missing. Set FIREBASE_SERVICE_ACCOUNT_JSON, " +
          "set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY, " +
          `or provide ${SERVICE_ACCOUNT_PATH}.`,
      });
    }
  })
  .transform((env) => ({
    ...env,
    CLIENT_URL: env.CLIENT_URL ?? DEV_CLIENT_URL,
  }));

export type Config = z.infer<typeof EnvSchema>;

/** Parse an env object. Throws one readable error listing every problem (names only, never values). */
export function parseEnv(env: NodeJS.ProcessEnv): Config {
  const result = EnvSchema.safeParse(env);

  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  - ${issue.path.join(".") || "env"}: ${issue.message}`
    );
    throw new Error(`Invalid environment configuration:\n${lines.join("\n")}`);
  }

  return result.data;
}

export const config: Config = parseEnv(process.env);

export const isProduction = config.NODE_ENV === "production";

const DEV_INSIGHTS_HASH_SECRET = "westforce-dev-insights-secret-not-for-production";

/**
 * Key for the daily visitor hash. Production cannot start without it (see the
 * env check above); this throw is a second guard. Other envs use a dev default.
 */
export function insightsHashSecret(env: Pick<Config, "NODE_ENV" | "INSIGHTS_HASH_SECRET"> = config): string {
  if (env.INSIGHTS_HASH_SECRET) return env.INSIGHTS_HASH_SECRET;

  if (env.NODE_ENV === "production") {
    throw new Error("INSIGHTS_HASH_SECRET is not configured.");
  }

  return DEV_INSIGHTS_HASH_SECRET;
}

/** ADMIN_EMAILS as a set: trimmed, lower case, blanks dropped. Empty means no admins. */
export function adminEmails(raw: string | undefined = config.ADMIN_EMAILS): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

/** Read at request time so it can be switched on without a redeploy of code. */
export function logClientIpEnabled(): boolean {
  return process.env.LOG_CLIENT_IP === "true";
}

const StripeEnvSchema = z.object({
  STRIPE_SECRET_KEY: optionalText,
  STRIPE_WEBHOOK_SECRET: optionalText,
  STRIPE_MODE: optionalText,
  NODE_ENV: optionalText,
  FRONTEND_URL: optionalText,
  CLIENT_URL: optionalText,
});

export type StripeEnv = z.infer<typeof StripeEnvSchema>;

/** Stripe stays optional: read lazily, only when a payment route runs. */
export function readStripeEnv(env: NodeJS.ProcessEnv = process.env): StripeEnv {
  return StripeEnvSchema.parse(env);
}
