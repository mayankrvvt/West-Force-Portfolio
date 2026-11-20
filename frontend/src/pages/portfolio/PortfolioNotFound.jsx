import { Link } from "react-router-dom";

import "../../styles/portfolio.css";

/* Shared "not found" look for missing pages and unpublished portfolios. */
export default function PortfolioNotFound({
  title = "Page not found",
  message = "This portfolio or page does not exist. Check the link you were sent, or ask the candidate for a new one.",
  detail = "",
}) {
  return (
    <main className="portfolio-error">
      <img
        src="/favicon.png"
        alt="WestForce"
        className="portfolio-error-logo"
        width="40"
        height="40"
      />

      <h1>{title}</h1>

      <p>{message}</p>

      {detail && <p className="portfolio-error-detail">{detail}</p>}

      <Link to="/" className="btn btn-primary">
        Go to the home page
      </Link>
    </main>
  );
}
