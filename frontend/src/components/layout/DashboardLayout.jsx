import { useEffect, useRef, useState } from "react";

import {
  LayoutDashboard,
  BriefcaseBusiness,
  Sparkles,
  ScanSearch,
  FilePenLine,
  Files,
  FileCheck2,
  Award,
  ClipboardList,
  Video,
  Search,
  User,
  Settings,
  ShieldCheck,
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
import useIsAdmin from "../../hooks/useIsAdmin";

import { apiRequest } from "../../utils/api";
import { DEMO_MODE, signOutDemo } from "../../demo/demoMode";
import DemoBadge from "../../demo/DemoBadge";
import "../../styles/dashboard-product.css";


const navigation = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { name: "My portfolio", path: "/dashboard/portfolio", icon: BriefcaseBusiness },
    ],
  },
  {
    label: "Build and AI",
    items: [
      { name: "AI resume builder", path: "/dashboard/resume-builder", icon: Sparkles },
      { name: "ATS resume checker", path: "/dashboard/ats-checker", icon: ScanSearch },
      { name: "Tailor resume", path: "/dashboard/tailor-resume", icon: FilePenLine },
      { name: "My resumes", path: "/dashboard/resumes", icon: FileCheck2 },
    ],
  },
  {
    label: "Career",
    items: [
      { name: "Find jobs", path: "/dashboard/jobs", icon: Search },
      { name: "Applications", path: "/dashboard/applications", icon: ClipboardList },
      { name: "Video Q&A", path: "/dashboard/video-qa", icon: Video },
      { name: "Documents", path: "/dashboard/documents", icon: Files },
      { name: "Certificates", path: "/dashboard/certificates", icon: Award },
    ],
  },
  {
    label: "Account",
    items: [
      { name: "Profile", path: "/dashboard/profile", icon: User },
      { name: "Settings", path: "/dashboard/settings", icon: Settings },
    ],
  },
];

// Shown only to admins, once the check says so.
const adminNavigation = [
  ...navigation,
  {
    label: "Admin",
    items: [
      { name: "Admin", path: "/admin/jobs", match: "/admin/", icon: ShieldCheck },
    ],
  },
];


const pageTitles = {
  "/dashboard": "Dashboard",
  "/dashboard/portfolio": "My portfolio",
  "/dashboard/resume-builder": "AI resume builder",
  "/dashboard/resume-editor": "Resume editor",
  "/dashboard/ats-checker": "ATS resume checker",
  "/dashboard/tailor-resume": "Tailor resume",
  "/dashboard/resumes": "My resumes",
  "/dashboard/documents": "Documents",
  "/dashboard/certificates": "Certificates",
  "/dashboard/applications": "Applications",
  "/dashboard/video-qa": "Video Q&A",
  "/dashboard/jobs": "Find jobs",
  "/dashboard/profile": "Profile",
  "/dashboard/settings": "Settings",
  "/admin/jobs": "Manage jobs",
  "/admin/admins": "Admins",
  "/admin/settings": "Site settings",
  "/admin/activity": "Activity",
};


function SidebarContent({
  collapsed,
  onNavigate,
  account,
  sections,
}) {
  const { pathname } = useLocation();

  const handleLogout = async () => {
    try {
      if (DEMO_MODE) {
        await signOutDemo();
      } else {
        // Loaded on demand so Firebase stays out of the main bundle.
        const { auth, signOut } = await import("../../firebase/firebase");
        await signOut(auth);
      }

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
            width="28"
            height="28"
          />

          {!collapsed && (
            <span className="dashboard-brand-name" aria-hidden="true">
              WestForce
            </span>
          )}
        </NavLink>

      </div>


      {/* Navigation */}

      <nav className="dashboard-sidebar-nav" aria-label="Dashboard">

        {sections.map((section) => (
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
                      isActive ||
                      (item.match && pathname.startsWith(item.match))
                        ? "active"
                        : ""
                    }`
                  }
                  title={
                    collapsed
                      ? item.name
                      : undefined
                  }
                  aria-label={
                    collapsed
                      ? item.name
                      : undefined
                  }
                >

                  <Icon
                    size={18}
                    strokeWidth={1.8}
                    aria-hidden="true"
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

        <NavLink
          to="/dashboard/profile"
          onClick={onNavigate}
          className="dashboard-account"
          title={
            collapsed
              ? `${account.fullName}, open profile`
              : undefined
          }
          aria-label={
            collapsed
              ? `${account.fullName}, open profile`
              : undefined
          }
        >

          <span className="dashboard-avatar" aria-hidden="true">
            {account.initials}
          </span>

          {!collapsed && (
            <span className="dashboard-account-copy">
              <strong>{account.fullName}</strong>
              <span>{account.email}</span>
            </span>
          )}

        </NavLink>

        <button
          type="button"
          className="dashboard-logout"
          onClick={handleLogout}
          title={
            collapsed
              ? "Sign out"
              : undefined
          }
          aria-label={
            collapsed
              ? "Sign out"
              : undefined
          }
        >

          <LogOut
            size={18}
            strokeWidth={1.8}
            aria-hidden="true"
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

  // Never blocks the nav: the Admin link just appears once the check passes.
  const { isAdmin } = useIsAdmin();
  const sections = isAdmin ? adminNavigation : navigation;


  const [collapsed, setCollapsed] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const menuButtonRef = useRef(null);
  const drawerCloseRef = useRef(null);


  // Close the drawer whenever the route changes (back button, links in pages)

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);


  // While the drawer is open: lock page scroll, close on Escape,
  // move focus into the drawer and give it back to the menu button after.

  useEffect(() => {
    if (!mobileOpen) {
      return undefined;
    }

    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawerCloseRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      menuButton?.focus();
    };
  }, [mobileOpen]);


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
    "";


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


  const account = {
    fullName,
    email,
    initials: initials || "DU",
  };


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
          account={account}
          sections={sections}
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
        id="dashboard-mobile-drawer"
        aria-label="Navigation"
        inert={!mobileOpen}
      >

        <SidebarContent
          collapsed={false}
          onNavigate={
            handleMobileNavigation
          }
          account={account}
          sections={sections}
        />


        <div className="mobile-sidebar-close">

          <button
            type="button"
            ref={drawerCloseRef}
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
              ref={menuButtonRef}
              onClick={() =>
                setMobileOpen(true)
              }
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              aria-controls="dashboard-mobile-drawer"
            >

              <Menu size={20} />

            </button>


            <nav
              className="dashboard-breadcrumb"
              aria-label="Breadcrumb"
            >

              {location.pathname === "/dashboard" ? (
                <span aria-current="page">
                  Dashboard
                </span>
              ) : (
                <>
                  <NavLink to="/dashboard">
                    Dashboard
                  </NavLink>

                  <ChevronRight
                    size={14}
                    aria-hidden="true"
                  />

                  <span aria-current="page">
                    {pageTitle}
                  </span>
                </>
              )}

            </nav>

            {DEMO_MODE && <DemoBadge inline />}

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


            <div className="dashboard-avatar" aria-hidden="true">

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