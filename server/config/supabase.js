let supabase = null;

try {
  const { createClient } = require("@supabase/supabase-js");

  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (url && key) {
    supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } else {
    console.warn(
      "Supabase is not configured. Video uploads will be unavailable until SUPABASE_URL and SUPABASE_SECRET_KEY are set."
    );
  }
} catch (error) {
  console.warn(
    "Supabase client could not be initialized:",
    error.message
  );
}

module.exports = supabase;
