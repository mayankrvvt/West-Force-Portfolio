import { Link } from "react-router-dom";

export default function CTA() {
  return (
    <section className="home-section home-cta" aria-labelledby="cta-title">
      <div className="container home-cta-inner">
        <div>
          <h2 id="cta-title">
            Ready to build your portfolio?
          </h2>

          <p>
            Bring your resume, video and credentials together
            in one link.
          </p>
        </div>

        <Link to="/auth/sign-up" className="btn btn-primary btn-lg">
          Build your portfolio
        </Link>
      </div>
    </section>
  );
}
