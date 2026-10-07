import { Link } from "react-router-dom";

export default function MobileNavbar() {
  return (
    <nav className="mobile-dashboard-nav">

      <Link to="/dashboard">
        Dashboard
      </Link>

      <Link to="/dashboard/portfolio">
        Portfolio
      </Link>

      <Link to="/dashboard/jobs">
        Jobs
      </Link>

      <Link to="/dashboard/applications">
        Applications
      </Link>

    </nav>
  );
}