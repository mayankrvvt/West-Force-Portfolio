import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import MapleLeaf from "../brand/MapleLeaf";

// Solid navy band, white text, a faint flag red leaf behind it.
export default function CTA() {
  return (
    <section className="home-section home-cta" aria-labelledby="cta-title">
      <MapleLeaf className="home-cta-leaf" />

      <div className="container home-cta-inner">
        <div>
          <h2 id="cta-title">
            Start with your resume. Add the rest as you go.
          </h2>

          <p>
            Create your account and upload your resume today. Your video
            and certificates can follow when they are ready.
          </p>
        </div>

        <div className="home-cta-actions">
          <Link to="/auth/sign-up" className="btn btn-lg home-cta-button">
            Build your portfolio
            <ArrowRight className="home-cta-arrow" size={18} strokeWidth={2} aria-hidden="true" />
          </Link>

          <Link to="/pricing" className="home-cta-link">
            See pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
