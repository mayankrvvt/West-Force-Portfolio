import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { publicNavigation } from "../../constants/navigation";

export default function Navbar() {
  const location = useLocation();
  const [menuOpenAt, setMenuOpenAt] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const sentinelRef = useRef(null);

  // The bar turns more solid once the page has scrolled past a sentinel at
  // the very top (IntersectionObserver, no scroll listener).
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setScrolled(!entry.isIntersecting);
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // The menu closes on its own after navigation because it is tied to the
  // path it was opened on.
  const menuOpen = menuOpenAt === location.pathname + location.hash;

  const closeMenu = () => setMenuOpenAt(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setMenuOpenAt(null);
    };
    // The open menu covers the page, so the page behind it stays still.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    setMenuOpenAt(menuOpen ? null : location.pathname + location.hash);
  };

  // Section links (/#services) count as current when the home page is
  // showing that hash; page links use NavLink's own aria-current.
  const isCurrentSection = (href) => {
    const [path, hash] = href.split("#");
    return location.pathname === (path || "/") && location.hash === `#${hash}`;
  };

  return (
    <>
      <span ref={sentinelRef} className="site-header-sentinel" aria-hidden="true" />
      <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
        <a href="#main" className="skip-to-content">
          Skip to content
        </a>

        <div className={`site-header-inner${menuOpen ? " is-open" : ""}`}>
          <Link to="/" className="site-brand" aria-label="WestForce home">
            <img className="site-brand-mark" src="/favicon.png" alt="WestForce" width="32" height="32" />
            <span>WestForce</span>
          </Link>

          <button
            type="button"
            className="site-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={toggleMenu}
          >
            <span className="site-menu-icon" aria-hidden="true">
              <span />
              <span />
            </span>
            <span>Menu</span>
          </button>

          <div
            id="site-menu"
            className={`site-menu${menuOpen ? " is-open" : ""}`}
            onClick={(event) => {
              if (event.target.closest("a")) closeMenu();
            }}
          >
            <nav className="site-nav" aria-label="Main">
              {publicNavigation.map((item, index) =>
                item.href.includes("#") ? (
                  <Link
                    key={item.label}
                    to={item.href}
                    style={{ "--i": index }}
                    className={isCurrentSection(item.href) ? "active" : undefined}
                    aria-current={isCurrentSection(item.href) ? "location" : undefined}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <NavLink key={item.label} to={item.href} style={{ "--i": index }}>
                    {item.label}
                  </NavLink>
                )
              )}
            </nav>

            <div
              className="site-header-actions"
              style={{ "--i": publicNavigation.length }}
            >
              <Link to="/auth/sign-in" className="btn btn-ghost">
                Sign in
              </Link>

              <Link to="/auth/sign-up" className="btn btn-primary">
                Get started
              </Link>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
