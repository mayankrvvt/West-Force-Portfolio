import {
  NavLink,
  Link
} from "react-router-dom";

const links = [
  ["/dashboard", "Dashboard"],
  ["/dashboard/portfolio", "My Portfolio"],
  ["/dashboard/documents", "Documents"],
  ["/dashboard/resume", "Resume"],
  ["/dashboard/certificates", "Certificates"],
  ["/dashboard/jobs", "Jobs"],
  ["/dashboard/applications", "Applications"],
  ["/dashboard/profile", "Profile"],
  ["/dashboard/settings", "Settings"]
];

export default function Sidebar() {
  return (
    <aside className="sidebar">

      <Link
        to="/"
        className="brand"
      >
        <img
          src="/favicon.png"
          alt="WestForce"
        />

        <span>
          WestForce
        </span>
      </Link>

      <nav>

        {links.map(
          ([path, label]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/dashboard"}
              className={({ isActive }) =>
                isActive
                  ? "sidebar-link active"
                  : "sidebar-link"
              }
            >
              {label}
            </NavLink>
          )
        )}

      </nav>

    </aside>
  );
}