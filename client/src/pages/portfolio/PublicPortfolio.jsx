import { useParams } from "react-router-dom";

import usePortfolio from "../../hooks/usePortfolio";

import DynamicPortfolioTemplate from "../../components/portfolio/DynamicPortfolioTemplate";

import "../../styles/portfolio.css";

export default function PublicPortfolio() {
  const { slug } = useParams();

  const {
    portfolio,
    loading,
    error,
  } = usePortfolio(slug);

  // -----------------------------
  // LOADING
  // -----------------------------

  if (loading) {
    return (
      <main className="public-portfolio">
        <div className="portfolio-loading">
          <div className="loading-spinner" />

          <h2>Loading portfolio...</h2>

          <p>
            Please wait while we load the portfolio.
          </p>
        </div>
      </main>
    );
  }

  // -----------------------------
  // ERROR / NOT FOUND
  // -----------------------------

  if (error || !portfolio) {
    return (
      <main className="public-portfolio">
        <div className="portfolio-error">
          <span className="error-code">
            404
          </span>

          <h1>
            Portfolio Not Found
          </h1>

          <p>
            {error ||
              "The portfolio you're looking for does not exist."}
          </p>

          <a
            href="/"
            className="primary-button"
          >
            Go Home →
          </a>
        </div>
      </main>
    );
  }

  // -----------------------------
  // DYNAMIC CANADIAN PORTFOLIO
  // -----------------------------

  return (
    <DynamicPortfolioTemplate
      portfolio={portfolio}
    />
  );
}