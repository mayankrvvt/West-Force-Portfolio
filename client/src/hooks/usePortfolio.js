// client/src/hooks/usePortfolio.js

import { useEffect, useState } from "react";
import { getPortfolio } from "../services/portfolioService";

export default function usePortfolio(slug) {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPortfolio() {
      try {
        setLoading(true);
        setError("");

        const result = await getPortfolio(slug);

        if (cancelled) {
          return;
        }

        if (!result) {
          setPortfolio(null);
          setError("Portfolio not found.");
          return;
        }

        setPortfolio(result);
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to load portfolio:",
          err
        );

        setPortfolio(null);

        setError(
          err.message ||
            "Unable to load portfolio."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (!slug) {
      setPortfolio(null);
      setError("Portfolio slug is missing.");
      setLoading(false);
      return;
    }

    loadPortfolio();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return {
    portfolio,
    loading,
    error,
  };
}