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

  if (loading) {
    return (
      <main className="public-portfolio">
        <div className="portfolio-loading" role="status">
          <div className="loading-spinner" aria-hidden="true" />
          <h2>Loading portfolio…</h2>
        </div>
      </main>
    );
  }

  if (error || !portfolio) {
    return (
      <main className="public-portfolio">
        <div className="portfolio-error">
          <h1>We couldn't find this portfolio</h1>

          <p>
            {error ||
              "The link may be mistyped, or the portfolio is no longer published."}
          </p>

          <a href="/" className="btn btn-primary">
            Go to the home page
          </a>
        </div>
      </main>
    );
  }

  return (
    <DynamicPortfolioTemplate
      portfolio={portfolio}
    />
  );
}