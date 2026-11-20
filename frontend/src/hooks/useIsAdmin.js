import { useCallback, useEffect, useState } from "react";

import useAuth from "./useAuth";
import { getAdminStatus } from "../services/adminService";

// One check per signed-in user, shared by the sidebar and the admin route.
let cached = null; // { key, promise }

function fetchAdminStatus(key, force) {
  if (force || !cached || cached.key !== key) {
    const promise = getAdminStatus();
    cached = { key, promise };
    // Don't keep a failed check; the next caller tries again.
    promise.catch(() => {
      if (cached?.promise === promise) cached = null;
    });
  }
  return cached.promise;
}

/** Whether the signed-in user is an admin. Asks GET /api/admin/me. */
export default function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const key = user ? user.uid || user.email || "signed-in" : null;
  const [result, setResult] = useState({ key: null, attempt: -1, isAdmin: false, isOwner: false, error: "" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (authLoading || !key) return undefined;
    let active = true;
    fetchAdminStatus(key, attempt > 0).then(
      ({ isAdmin, isOwner }) => {
        if (active) setResult({ key, attempt, isAdmin, isOwner: isAdmin && isOwner, error: "" });
      },
      (error) => {
        console.error("Failed to check admin access:", error);
        if (active) setResult({ key, attempt, isAdmin: false, isOwner: false, error: error.message || "Could not check your access." });
      }
    );
    return () => {
      active = false;
    };
  }, [authLoading, key, attempt]);

  const refresh = useCallback(() => setAttempt((value) => value + 1), []);
  const settled = result.key === key && result.attempt === attempt;

  return {
    isAdmin: Boolean(key) && settled && result.isAdmin,
    isOwner: Boolean(key) && settled && result.isOwner,
    loading: authLoading || (Boolean(key) && !settled),
    error: settled ? result.error : "",
    refresh,
  };
}
