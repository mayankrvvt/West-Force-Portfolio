/**
 * Local-dev-only demo login.
 *
 * ON only when BOTH are true:
 *   - Vite dev server (import.meta.env.DEV)
 *   - VITE_DEMO_LOGIN=true (frontend/.env.development.local, git-ignored)
 *
 * In a production build import.meta.env.DEV is the literal `false`, so every
 * `if (DEMO_MODE)` branch and the demo data are removed by the bundler.
 */
export const DEMO_MODE =
  import.meta.env.DEV &&
  import.meta.env.VITE_DEMO_LOGIN === "true";

const SIGNED_OUT_KEY = "westforce_demo_signed_out";
export const DEMO_STATE_KEY = "westforce_demo_state_v2";

export const DEMO_USER = {
  uid: "demo-emma-tremblay",
  email: "emma.demo@example.com",
  displayName: "Emma Tremblay",
  emailVerified: true,
  isDemo: true,
  getIdToken: async () => "demo-token",
};

const listeners = new Set();

function readSignedOut() {
  try {
    return localStorage.getItem(SIGNED_OUT_KEY) === "true";
  } catch {
    return false;
  }
}

/** Demo user while the demo session is on, otherwise null. */
export function getDemoSessionUser() {
  return readSignedOut() ? null : DEMO_USER;
}

export function subscribeDemoSession(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => listener(getDemoSessionUser()));
}

export function signInDemo() {
  try {
    localStorage.removeItem(SIGNED_OUT_KEY);
  } catch {
    /* storage blocked: session still works for this page */
  }
  notify();
}

/** Sign out and reset the demo data back to the sample persona. */
export function signOutDemo() {
  try {
    localStorage.setItem(SIGNED_OUT_KEY, "true");
    localStorage.removeItem(DEMO_STATE_KEY);
  } catch {
    /* ignore */
  }
  notify();
}
