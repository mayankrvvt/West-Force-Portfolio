import { NavLink } from "react-router-dom";

export default function MobileNavbar() {
  return (
    <nav className="mobile-dashboard-nav" aria-label="Dashboard">
      <NavLink to="/dashboard" end>
        Dashboard
      </NavLink>

      <NavLink to="/dashboard/portfolio">
        Portfolio
      </NavLink>

      <NavLink to="/dashboard/jobs">
        Jobs
      </NavLink>

      <NavLink to="/dashboard/applications">
        Applications
      </NavLink>
    </nav>
  );
}
