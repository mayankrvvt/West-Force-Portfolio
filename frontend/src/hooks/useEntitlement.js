import { useCallback, useEffect, useState } from "react";

import useAuth from "./useAuth";
import { apiRequest } from "../utils/api";

export default function useEntitlement() {
  const { user, loading: authLoading } = useAuth();
  const [entitlement, setEntitlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!user) {
      setEntitlement(null);
      setError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/api/payments/me");
      setEntitlement(result);
    } catch (requestError) {
      console.error("Failed to check payment entitlement:", requestError);
      setEntitlement(null);
      setError(requestError.message || "Unable to check your plan.");
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    isPaid: entitlement?.isPaid === true,
    plan: entitlement?.plan || null,
    email: entitlement?.email || user?.email || "",
    emailVerificationRequired:
      entitlement?.emailVerificationRequired === true,
    loading: authLoading || loading,
    error,
    refresh,
  };
}
