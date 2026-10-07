import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  BriefcaseBusiness,
  Sparkles,
  ScanSearch,
  Files,
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
} from "react-router-dom";

import useAuth from "../../hooks/useAuth";

import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";

import { apiRequest } from "../../utils/api";
import "../../styles/dashboard-product.css";


const navigation = [
  {
    label: "OVERVIEW",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { name: "My Portfolio", path: "/dashboard/portfolio", icon: BriefcaseBusiness },
    ],
  },
  {
    label: "BUILD & AI",
    items: [
      { name: "AI Resume Builder", path: "/dashboard/resume-builder", icon: Sparkles },
      { name: "ATS Resume Checker", path: "/dashboard/ats-checker", icon: ScanSearch },
      { name: "My Resumes", path: "/dashboard/resumes", icon: FileCheck2 },
    ],
  },
  {
    label: "CAREER",
    items: [
      { name: "Find Jobs", path: "/dashboard/jobs", icon: Search },
      { name: "Applications", path: "/dashboard/applications", icon: ClipboardList },
      { name: "Documents", path: "/dashboard/documents", icon: Files },
      { name: "Certificates", path: "/dashboard/certificates", icon: Award },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { name: "Profile", path: "/dashboard/profile", icon: User },
      { name: "Settings", path: "/dashboard/settings", icon: Settings },
    ],
  },
];


const pageTitles = {
  "/dashboard": "Dashboard",
  "/dashboard/portfolio": "My Portfolio",
  "/dashboard/resume-builder": "AI Resume Builder",
  "/dashboard/ats-checker": "ATS Resume Checker",
  "/dashboard/resumes": "My Resumes",
  "/dashboard/documents": "Documents",
  "/dashboard/certificates": "Certificates",
  "/dashboard/applications": "Applications",
  "/dashboard/jobs": "Find Jobs",
  "/dashboard/profile": "Profile",
  "/dashboard/settings": "Settings",
};


function SidebarContent({
  collapsed,
  onNavigate,
}) {
  const handleLogout = async () => {
    try {
      await signOut(auth);

      onNavigate?.();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    }
  };


  return (
    <div className="dashboard-sidebar-inner">

      {/* Brand */}

      <div className="dashboard-brand">

        <NavLink
          to="/dashboard"
          onClick={onNavigate}
        >
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
                  end={
                    item.path === "/dashboard"
                  }
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `dashboard-nav-link ${
                      isActive
                        ? "active"
                        : ""
                    }`
                  }
                  title={
                    collapsed
                      ? item.name
                      : undefined
                  }
                >

                  <Icon
                    size={19}
                    strokeWidth={1.8}
                  />

                  {!collapsed && (
                    <span>
                      {item.name}
                    </span>
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
          title={
            collapsed
              ? "Sign out"
              : undefined
          }
        >

          <LogOut
            size={19}
            strokeWidth={1.8}
          />

          {!collapsed && (
            <span>
              Sign out
            </span>
          )}

        </button>

      </div>

    </div>
  );
}


export default function DashboardLayout() {

  const location = useLocation();

  const { user } = useAuth();


  const [collapsed, setCollapsed] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);


  // Portfolio information from MongoDB

  const [portfolio, setPortfolio] =
    useState(null);


  // Load the logged-in user's portfolio

  useEffect(() => {

    let cancelled = false;


    async function loadPortfolio() {

      try {

        const result =
          await apiRequest(
            "/api/portfolios/me"
          );


        if (cancelled) {
          return;
        }


        const portfolioData =
          result?.portfolio ||
          result?.data ||
          result;


        setPortfolio(
          portfolioData
        );

      } catch (error) {

        console.error(
          "Failed to load portfolio user information:",
          error
        );

        if (!cancelled) {
          setPortfolio(null);
        }

      }

    }


    if (user) {
      loadPortfolio();
    }


    return () => {
      cancelled = true;
    };

  }, [user]);


  const pageTitle =
    pageTitles[location.pathname] ||
    "Dashboard";


  /*
   * IMPORTANT:
   *
   * First use the name entered in the
   * portfolio profile and stored in MongoDB.
   *
   * Then fall back to Firebase.
   */

  const fullName =
    portfolio?.profile?.name ||
    user?.displayName ||
    user?.fullName ||
    user?.user_metadata?.full_name ||
    "Demo User";


  /*
   * Email:
   *
   * Prefer the portfolio email if the
   * user entered one.
   *
   * Otherwise use Firebase email.
   */

  const email =
    portfolio?.profile?.email ||
    user?.email ||
    "demo@westforce.com";


  /*
   * Generate initials automatically.
   *
   * Example:
   *
   * Mayank Rawat → MR
   * John Smith → JS
   * Mayank → M
   */

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (part) => part[0]
      )
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

      {/* =========================
          DESKTOP SIDEBAR
      ========================== */}

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
            setCollapsed(
              (value) => !value
            )
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


      {/* =========================
          MOBILE BACKDROP
      ========================== */}

      {mobileOpen && (
        <button
          type="button"
          className="dashboard-mobile-backdrop"
          onClick={closeMobile}
          aria-label="Close navigation"
        />
      )}


      {/* =========================
          MOBILE SIDEBAR
      ========================== */}

      <aside
        className={`dashboard-sidebar mobile-sidebar ${
          mobileOpen
            ? "mobile-sidebar-open"
            : ""
        }`}
      >

        <SidebarContent
          collapsed={false}
          onNavigate={
            handleMobileNavigation
          }
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


      {/* =========================
          MAIN
      ========================== */}

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

              <h1>
                {pageTitle}
              </h1>

            </div>

          </div>


          {/* =========================
              USER HEADER
          ========================== */}

          <NavLink
            to="/dashboard/profile"
            className="dashboard-header-user"
          >

            <div className="dashboard-user-copy">

              <strong>
                {fullName}
              </strong>

              <span>
                {email}
              </span>

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