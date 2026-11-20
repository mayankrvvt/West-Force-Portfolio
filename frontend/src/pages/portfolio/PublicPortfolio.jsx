import { useEffect, useRef } from "react";
import { useParams } from "react-router-dom";

import usePortfolio from "../../hooks/usePortfolio";
import usePageTitle from "../../hooks/usePageTitle";
import { sendPortfolioView } from "../../services/insightsService";

import DynamicPortfolioTemplate from "../../components/portfolio/DynamicPortfolioTemplate";
import PortfolioNotFound from "./PortfolioNotFound";

import "../../styles/portfolio.css";

/* Placeholder shaped like the portfolio while it loads */
function PortfolioSkeleton() {
  return (
    <div className="public-portfolio" role="status" aria-live="polite">
      <span className="sr-only">Loading portfolio…</span>

      <div className="portfolio-sidebar" aria-hidden="true">
        <div className="portfolio-sidebar-inner">
          <img
            src="/favicon.png"
            alt=""
            className="portfolio-sidebar-logo"
            width="28"
            height="28"
          />
        </div>
      </div>

      <div className="portfolio-hero" aria-hidden="true">
        <div className="portfolio-hero-inner">
          <div className="portfolio-hero-identity">
            <span className="portfolio-monogram pf-skeleton" />
            <div className="pf-skeleton-stack">
              <span className="pf-skeleton pf-skeleton-title" />
              <span className="pf-skeleton pf-skeleton-line" />
              <span className="pf-skeleton pf-skeleton-line is-short" />
            </div>
          </div>
        </div>
      </div>

      <div className="portfolio-main" aria-hidden="true">
        {[0, 1].map((key) => (
          <div className="portfolio-section" key={key}>
            <span className="pf-skeleton pf-skeleton-line is-short" />
            <div className="portfolio-section-body pf-skeleton-stack">
              <span className="pf-skeleton pf-skeleton-line" />
              <span className="pf-skeleton pf-skeleton-line" />
              <span className="pf-skeleton pf-skeleton-line is-short" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PublicPortfolio() {
  const { slug } = useParams();

  const {
    portfolio,
    loading,
    error,
  } = usePortfolio(slug);

  // One view per page load. The ref also stops the second effect run in StrictMode.
  const sentFor = useRef(null);
  const loaded = Boolean(portfolio) && !loading && !error;

  // "Emma Tremblay · Personal support worker"; the brand when there is no role
  usePageTitle(
    loaded ? portfolio.profile?.name?.trim() : null,
    loaded
      ? String(portfolio.profile?.title || portfolio.hero?.headline || "").trim()
      : ""
  );

  useEffect(() => {
    if (!loaded || !slug || sentFor.current === slug) return;
    sentFor.current = slug;
    // Fire and forget: never blocks rendering, errors are ignored.
    sendPortfolioView(slug);
  }, [loaded, slug]);

  if (loading) {
    return <PortfolioSkeleton />;
  }

  if (error || !portfolio) {
    return (
      <PortfolioNotFound
        title="We couldn't find this portfolio"
        message="The link may be mistyped, or the portfolio is no longer published. Check the link you were sent, or ask the candidate for a new one."
        detail={error || ""}
      />
    );
  }

  return (
    <DynamicPortfolioTemplate
      portfolio={portfolio}
      contactBar
    />
  );
}
