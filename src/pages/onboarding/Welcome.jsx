import { Link } from "react-router-dom";
import Button from "../../components/common/Button";

export default function Welcome() {
  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <img
          src="/favicon.png"
          className="onboarding-logo"
          alt="WestForce"
        />

        <p className="eyebrow">
          WELCOME TO WESTFORCE
        </p>

        <h1>
          Let's build your professional portfolio.
        </h1>

        <p>
          We'll guide you through your details,
          documents, experience, skills and
          credentials.
        </p>

        <Link to="/onboarding/personal-details">
          <Button>
            Start building
          </Button>
        </Link>
      </div>
    </div>
  );
}