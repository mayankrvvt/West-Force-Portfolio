import { Link } from "react-router-dom";

import { publicNavigation } from "../../constants/navigation";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <div className="site-footer-about">
          <Link to="/" className="site-brand">
            <img src="/favicon.png" alt="" width="28" height="28" />
            <span>WestForce Portfolio</span>
          </Link>

          <p>
            One secure link for your resume, video and
            credentials, ready for Canadian employers.
          </p>
        </div>

        <nav className="site-footer-nav" aria-label="Footer">
          {publicNavigation.map((item) => (
            <Link key={item.label} to={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="container site-footer-legal">
        <p>© 2026 WestForce Professional Portfolio</p>
      </div>
    </footer>
  );
}
