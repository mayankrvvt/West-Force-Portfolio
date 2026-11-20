import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config";
import { logger } from "../logger";

const REQUEST_TIMEOUT_MS = 30_000;

// Every Supabase call gets a timeout, combined with any signal the SDK passes.
const fetchWithTimeout: typeof fetch = (input, init = {}) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
};

function createSupabase(): SupabaseClient | null {
  const url = config.SUPABASE_URL;
  const key = config.SUPABASE_SECRET_KEY || config.SUPABASE_ANON_KEY;

  if (!url || !key) {
    logger.warn(
      "Supabase is not configured. Video uploads will be unavailable until SUPABASE_URL and SUPABASE_SECRET_KEY are set."
    );
    return null;
  }

  try {
    return createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: { fetch: fetchWithTimeout },
    });
  } catch (error) {
    logger.warn({ err: error }, "Supabase client could not be initialized");
    return null;
  }
}

/** The one Supabase client, or null when Supabase is not configured (optional service). */
const supabase = createSupabase();

export default supabase;
