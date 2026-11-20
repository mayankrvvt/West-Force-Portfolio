import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

import { publicNavigation } from "../../constants/navigation";

export default function Navbar() {
  const location = useLocation();
  const [menuOpenAt, setMenuOpenAt] = useState(null);

  // The menu closes on its own after navigation because it is tied to the
  // path it was opened on.
  const menuOpen = menuOpenAt === location.pathname + location.hash;

  const closeMenu = () => setMenuOpenAt(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setMenuOpenAt(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const toggleMenu = () => {
    setMenuOpenAt(menuOpen ? null : location.pathname + location.hash);
  };

  return (
    <header className="site-header">
      <a href="#main" className="skip-to-content">
        Skip to content
      </a>

      <div className="container site-header-inner">
        <Link to="/" className="site-brand">
          <img src="/favicon.png" alt="" width="32" height="32" />
          <span>WestForce Portfolio</span>
        </Link>

        <button
          type="button"
          className="site-menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          onClick={toggleMenu}
        >
          {menuOpen ? (
            <X size={20} aria-hidden="true" />
          ) : (
            <Menu size={20} aria-hidden="true" />
          )}
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
            {publicNavigation.map((item) =>
              item.href.includes("#") ? (
                <Link key={item.label} to={item.href}>
                  {item.label}
                </Link>
              ) : (
                <NavLink key={item.label} to={item.href}>
                  {item.label}
                </NavLink>
              )
            )}
          </nav>

          <div className="site-header-actions">
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
  );
}
