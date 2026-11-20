import { Link } from "react-router-dom";

/**
 * Plain page frame for sign-in, sign-up, password and status pages:
 * the logo, one heading, a short lede and the page content.
 */
export default function AuthLayout({ title, lede, children, footer }) {
  return (
    <main className="auth-page">
      <div className="auth-panel">
        <Link to="/" className="site-brand auth-brand">
          <img src="/favicon.png" alt="" width="32" height="32" />
          <span>WestForce Portfolio</span>
        </Link>

        <div className="auth-card">
          <h1>{title}</h1>

          {lede && <p className="auth-lede">{lede}</p>}

          {children}
        </div>

        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </main>
  );
}
