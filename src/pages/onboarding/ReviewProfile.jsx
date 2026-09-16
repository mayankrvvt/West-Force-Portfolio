import { Link } from "react-router-dom";

import Button from "../../components/common/Button";
import PortfolioPreview from "../../components/portfolio/PortfolioPreview";

export default function ReviewProfile() {
  return (
    <div className="onboarding-page wide">
      <div className="onboarding-card">
        <p className="eyebrow">
          STEP 7 OF 7
        </p>

        <h1>
          Review your portfolio
        </h1>

        <p>
          Preview your profile before publishing.
        </p>

        <PortfolioPreview
          profile={{
            name: "Candidate Name",
            headline: "Professional Candidate",
            about:
              "Your generated professional summary will appear here.",
          }}
        />

        <Link to="/dashboard">
          <Button className="full-width">
            Finish and open dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}