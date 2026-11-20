import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";
import { toText } from "./text";

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

const EnvSchema = z
  .object({
    NODE_ENV: optionalText,
    PORT: z.preprocess(
      (value) => (value === "" || value === undefined ? 5050 : value),
      z.coerce.number().int().min(0).max(65535)
    ),
    CLIENT_URL: textWithDefault("http://localhost:5173"),
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

    // Optional services. Their clients check what they need when first used.
    CLOUDINARY_URL: optionalText,
    CLOUDINARY_CLOUD_NAME: optionalText,
    CLOUDINARY_API_KEY: optionalText,
    CLOUDINARY_API_SECRET: optionalText,
    SUPABASE_URL: optionalText,
    SUPABASE_SECRET_KEY: optionalText,
    SUPABASE_ANON_KEY: optionalText,
    SUPABASE_VIDEO_BUCKET: textWithDefault("westforce-videos"),

    // Optional job search (Adzuna). Without the id + key, /api/jobs answers 503.
    ADZUNA_APP_ID: optionalText,
    ADZUNA_APP_KEY: optionalText,
    ADZUNA_COUNTRY: z.preprocess(
      (value) =>
        value === "" || value === undefined ? "in" : toText(value).trim().toLowerCase(),
      z.string().regex(/^[a-z]{2}$/, { error: "ADZUNA_COUNTRY must be a 2-letter code, e.g. in." })
    ),
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
  });

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
