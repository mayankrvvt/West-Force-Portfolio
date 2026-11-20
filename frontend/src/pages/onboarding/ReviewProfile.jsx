import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText } from "lucide-react";

import DynamicPortfolioTemplate from "../../components/portfolio/DynamicPortfolioTemplate";
import { OnboardingShell } from "../../components/common/OnboardingForm";
import { apiRequest } from "../../utils/api";
import "../../styles/onboarding.css";

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
    <OnboardingShell
      step={7}
      wide
      title="Review your portfolio"
      description="This is what employers see when they open your link. Check it, then head to your dashboard."
    >
      {loading && (
        <div className="onboarding-skeleton" role="status" aria-label="Loading your portfolio">
          <span className="ob-skeleton-line wide" />
          <span className="ob-skeleton-line" />
          <span className="ob-skeleton-block" />
        </div>
      )}

      {!loading && error && (
        <p className="ob-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && !portfolio && (
        <div className="ob-empty">
          <FileText size={22} aria-hidden="true" />
          <strong>Nothing to preview yet</strong>
          <p>Fill in your portfolio first, then come back here to see how it looks.</p>
          <Link to="/onboarding/create-portfolio" className="btn btn-secondary">
            Create your portfolio
          </Link>
        </div>
      )}

      {!loading && portfolio && (
        <div className="ob-preview">
          <DynamicPortfolioTemplate portfolio={portfolio} />
        </div>
      )}

      <div className="ob-actions ob-actions-finish">
        <Link to="/dashboard" className="btn btn-primary btn-lg">
          Finish and open dashboard
        </Link>
      </div>
    </OnboardingShell>
  );
}
