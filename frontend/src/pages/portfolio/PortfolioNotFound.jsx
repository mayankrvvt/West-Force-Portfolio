import { Link } from "react-router-dom";

import AuthLayout from "../../components/layout/AuthLayout";

export default function PortfolioNotFound() {
  return (
    <AuthLayout
      title="Page not found"
      lede="This portfolio or page does not exist. Check the link you were sent, or ask the candidate for a new one."
    >
      <Link to="/" className="btn btn-primary full-width">
        Go to the home page
      </Link>
    </AuthLayout>
  );
}
