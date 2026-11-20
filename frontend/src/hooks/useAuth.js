import { useEffect, useState } from "react";

import {
  DEMO_MODE,
  getDemoSessionUser,
  subscribeDemoSession,
} from "../demo/demoMode";
import { loadFirebase } from "../utils/api";

export default function useAuth() {
  const [user, setUser] = useState(() =>
    DEMO_MODE ? getDemoSessionUser() : null
  );
  const [loading, setLoading] = useState(!DEMO_MODE);

  useEffect(() => {
    // Local-dev-only demo login: no Firebase at all.
    if (DEMO_MODE) {
      return subscribeDemoSession(setUser);
    }

    // Firebase loads in its own chunk so it stays out of the main bundle.
    // loading stays true until Firebase reports the session, as before.
    let cancelled = false;
    let unsubscribe = null;

    // A flaky network can fail the chunk once; try one more time after a short wait.
    // Loaded through api.js so public requests know a session may exist.
    const loadWithRetry = () =>
      loadFirebase().catch(
        () =>
          new Promise((resolve) => setTimeout(resolve, 1000)).then(() => {
            if (cancelled) throw new Error("cancelled");
            return loadFirebase();
          })
      );

    loadWithRetry()
      .then(({ auth, onAuthStateChanged }) => {
        if (cancelled) return;

        unsubscribe = onAuthStateChanged(
          auth,
          (currentUser) => {
            setUser(currentUser);
            setLoading(false);
          }
        );
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Could not load sign in.", error);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return {
    user,
    loading,
    isAuthenticated: !!user,
  };
}
