import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import DynamicPortfolioTemplate from "../../components/portfolio/DynamicPortfolioTemplate";
import { apiRequest } from "../../utils/api";

import "../../styles/portfolio.css";
import "../../styles/portfolio-viewer.css";

export default function ReviewProfile() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    apiRequest("/api/portfolios/me")
      .then((result) => {
        if (active) setPortfolio(result?.portfolio || result?.data || result || null);
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 404) {
          setPortfolio(null);
          return;
        }
        setError(err.message || "Could not load your portfolio. Refresh the page to try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="onboarding-page wide">
      <div className="onboarding-card">
        <p className="onboarding-step">Step 7 of 7</p>

        <h1>Review your portfolio</h1>

        <p>This is how employers will see your portfolio. Check it before you open your dashboard.</p>

        {loading && <p role="status">Loading your portfolio…</p>}

        {!loading && error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && !portfolio && (
          <p>
            No portfolio saved yet. <Link to="/onboarding/create-portfolio">Create your portfolio</Link> first.
          </p>
        )}

        {!loading && portfolio && <DynamicPortfolioTemplate portfolio={portfolio} />}

        <Link to="/dashboard" className="btn btn-primary full-width">
          Finish and open dashboard
        </Link>
      </div>
    </div>
  );
}
