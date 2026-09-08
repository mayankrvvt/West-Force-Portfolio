import { useState } from "react";
import {
  LayoutDashboard,
  BriefcaseBusiness,
  FileText,
  FileCheck2,
  Award,
  ClipboardList,
  Search,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import useAuth from "../../hooks/useAuth";
import { signOutDemoUser } from "../../services/demoAuth";

const navigation = [
  {
    label: "OVERVIEW",
    items: [
      {
        name: "Dashboard",
        path: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        name: "My Portfolio",
        path: "/dashboard/portfolio",
        icon: BriefcaseBusiness,
      },
    ],
  },
  {
    label: "CAREER",
    items: [
      {
        name: "Documents",
        path: "/dashboard/documents",
        icon: FileText,
      },
      {
        name: "Resume",
        path: "/dashboard/resume",
        icon: FileCheck2,
      },
      {
        name: "Certificates",
        path: "/dashboard/certificates",
        icon: Award,
      },
      {
        name: "Applications",
        path: "/dashboard/applications",
        icon: ClipboardList,
      },
      {
        name: "Jobs",
        path: "/dashboard/jobs",
        icon: Search,
      },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      {
        name: "Profile",
        path: "/dashboard/profile",
        icon: User,
      },
      {
        name: "Settings",
        path: "/dashboard/settings",
        icon: Settings,
      },
    ],
  },
];

const pageTitles = {
  "/dashboard": "Dashboard",
  "/dashboard/portfolio": "My Portfolio",
  "/dashboard/documents": "Documents",
  "/dashboard/resume": "Resume",
  "/dashboard/certificates": "Certificates",
  "/dashboard/applications": "Applications",
  "/dashboard/jobs": "Jobs",
  "/dashboard/profile": "Profile",
  "/dashboard/settings": "Settings",
};

function SidebarContent({
  collapsed,
  onNavigate,
}) {
  const handleLogout = () => {
    signOutDemoUser();
    onNavigate?.();
  };

  return (
    <div className="dashboard-sidebar-inner">
      {/* Brand */}

      <div className="dashboard-brand">
        <NavLink to="/dashboard" onClick={onNavigate}>
          <img
            src="/favicon.png"
            alt="WestForce"
          />

          {!collapsed && (
            <span>
              WestForce
              <small>PORTFOLIO</small>
            </span>
          )}
        </NavLink>
      </div>

      {/* Navigation */}

      <nav className="dashboard-sidebar-nav">
        {navigation.map((section) => (
          <div
            className="dashboard-nav-section"
            key={section.label}
          >
            {!collapsed && (
              <p className="dashboard-nav-label">
                {section.label}
              </p>
            )}

            {section.items.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/dashboard"}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `dashboard-nav-link ${
                      isActive ? "active" : ""
                    }`
                  }
                  title={collapsed ? item.name : undefined}
                >
                  <Icon size={19} strokeWidth={1.8} />

                  {!collapsed && (
                    <span>{item.name}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}

      <div className="dashboard-sidebar-bottom">
        <button
          type="button"
          className="dashboard-logout"
          onClick={handleLogout}
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut
            size={19}
            strokeWidth={1.8}
          />

          {!collapsed && (
            <span>Sign out</span>
          )}
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const { user } = useAuth();

  const [collapsed, setCollapsed] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const pageTitle =
    pageTitles[location.pathname] ||
    "Dashboard";

  const fullName =
    user?.fullName ||
    user?.user_metadata?.full_name ||
    "Demo User";

  const email =
    user?.email ||
    "demo@westforce.com";

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const closeMobile = () => {
    setMobileOpen(false);
  };

  const handleMobileNavigation = () => {
    setMobileOpen(false);
  };

  return (
    <div
      className={`dashboard-layout ${
        collapsed
          ? "sidebar-collapsed"
          : ""
      }`}
    >
      {/* Desktop Sidebar */}

      <aside
        className="dashboard-sidebar desktop-sidebar"
      >
        <SidebarContent
          collapsed={collapsed}
          onNavigate={() => {}}
        />

        <button
          type="button"
          className="sidebar-collapse-button"
          onClick={() =>
            setCollapsed((value) => !value)
          }
          aria-label={
            collapsed
              ? "Expand sidebar"
              : "Collapse sidebar"
          }
        >
          {collapsed ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronLeft size={16} />
          )}
        </button>
      </aside>

      {/* Mobile Backdrop */}

      {mobileOpen && (
        <button
          type="button"
          className="dashboard-mobile-backdrop"
          onClick={closeMobile}
          aria-label="Close navigation"
        />
      )}

      {/* Mobile Sidebar */}

      <aside
        className={`dashboard-sidebar mobile-sidebar ${
          mobileOpen
            ? "mobile-sidebar-open"
            : ""
        }`}
      >
        <SidebarContent
          collapsed={false}
          onNavigate={handleMobileNavigation}
        />

        <div className="mobile-sidebar-close">
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
      </aside>

      {/* Main */}

      <main className="dashboard-main">
        {/* Header */}

        <header className="dashboard-header">
          <div className="dashboard-header-left">
            <button
              type="button"
              className="dashboard-mobile-menu"
              onClick={() =>
                setMobileOpen(true)
              }
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>

            <div>
              <p className="dashboard-header-overline">
                WESTFORCE PORTFOLIO
              </p>

              <h1>{pageTitle}</h1>
            </div>
          </div>

          <NavLink
            to="/dashboard/profile"
            className="dashboard-header-user"
          >
            <div className="dashboard-user-copy">
              <strong>{fullName}</strong>
              <span>{email}</span>
            </div>

            <div className="dashboard-avatar">
              {initials || "DU"}
            </div>
          </NavLink>
        </header>

        {/* Page Content */}

        <div className="dashboard-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}