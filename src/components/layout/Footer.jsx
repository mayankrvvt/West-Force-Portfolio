import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="footer">

      <div className="container footer-inner">

        <div>

          <Link
            to="/"
            className="brand"
          >
            <img
              src="/favicon.png"
              alt="WestForce"
            />

            <span>
              WestForce Portfolio
            </span>
          </Link>

          <p>
            One professional link.
            Every credential.
            Every employer.
          </p>

        </div>

        <div className="footer-links">

          <Link to="/#services">
            Services
          </Link>

          <Link to="/#portfolio">
            Portfolio
          </Link>

          <Link to="/how-it-works">
            How it works
          </Link>

          <Link to="/pricing">
            Pricing
          </Link>

        </div>

      </div>

      <div className="container copyright">
        © 2026 WestForce Professional
        Portfolio
      </div>

    </footer>
  );
}