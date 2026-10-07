import { Link } from "react-router-dom";
import Button from "../common/Button";

export default function CTA() {
  return (
    <section className="section">
      <div className="container cta">
        <div>
          <p className="eyebrow">
            START YOUR NEXT CHAPTER
          </p>

          <h2>
            Ready to build your professional profile?
          </h2>

          <p>
            Create your portfolio and bring your credentials
            together.
          </p>
        </div>

        <Link to="/auth/sign-up">
          <Button>
            Create your portfolio
          </Button>
        </Link>
      </div>
    </section>
  );
}