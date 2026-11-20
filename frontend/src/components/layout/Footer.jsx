import { Link } from "react-router-dom";

import { publicNavigation } from "../../constants/navigation";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <div className="site-footer-about">
          <Link to="/" className="site-brand" aria-label="WestForce home">
            <img className="site-brand-mark" src="/favicon.png" alt="WestForce" width="32" height="32" />
            <span>WestForce</span>
          </Link>

          <p>
            Your resume, video and certificates on one page, with
            documents behind a PIN. Made for job seekers in Canada.
          </p>
        </div>

        <nav className="site-footer-nav" aria-label="Footer">
          <ul>
            {publicNavigation.map((item) => (
              <li key={item.label}>
                <Link to={item.href}>{item.label}</Link>
              </li>
            ))}

            <li>
              <Link to="/auth/sign-in">Sign in</Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="container site-footer-legal">
        <p>© {new Date().getFullYear()} WestForce Professional Portfolio</p>
        <p>All prices in Canadian dollars.</p>
      </div>
    </footer>
  );
}
