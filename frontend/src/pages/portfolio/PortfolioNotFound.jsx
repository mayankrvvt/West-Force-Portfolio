import { Link } from "react-router-dom";

export default function PortfolioNotFound() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>
          Page not found
        </h1>

        <p>
          The requested portfolio does not exist.
        </p>

        <Link to="/">
          Return home
        </Link>
      </div>
    </div>
  );
}