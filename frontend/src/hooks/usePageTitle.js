import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BRAND = "WestForce";
const HOME_TITLE = "WestForce · Portfolios for job seekers in Canada";

// Tab titles by path. Pages not listed fall back to "WestForce Portfolio".
const routeTitles = {
  "/": HOME_TITLE,
  "/pricing": "Pricing",
  "/how-it-works": "How it works",
  "/video-resume-guide": "Video resume guide",

  "/auth/sign-in": "Sign in",
  "/auth/sign-up": "Create account",
  "/auth/forgot-password": "Forgot password",
  "/auth/reset-password": "Reset password",
  "/auth/action": "Your account",

  "/payment/success": "Payment complete",
  "/payment/cancelled": "Payment cancelled",

  "/onboarding/welcome": "Welcome",
  "/onboarding/create-portfolio": "Create your portfolio",
  "/onboarding/personal-details": "Personal details",
  "/onboarding/documents": "Documents",
  "/onboarding/experience": "Experience",
  "/onboarding/education": "Education",
  "/onboarding/skills": "Skills",
  "/onboarding/certificates": "Certificates",
  "/onboarding/review-profile": "Review your profile",

  "/dashboard": "Dashboard",
  "/dashboard/portfolio": "My portfolio",
  "/dashboard/resume": "Resume",
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

  "/admin": "Admin",
  "/admin/jobs": "Manage jobs",
  "/admin/admins": "Admins",
  "/admin/settings": "Site settings",
  "/admin/activity": "Activity",

  "/portfolio-not-found": "Portfolio not found",
};

function formatTitle(name, suffix = "") {
  if (!name) return "WestForce Portfolio";
  if (name === HOME_TITLE) return name;
  return `${name} · ${suffix || BRAND}`;
}

function titleForPath(pathname) {
  const path =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  if (routeTitles[path]) return routeTitles[path];
  if (path.startsWith("/portfolio/")) return "Portfolio";
  return "Page not found";
}

/**
 * Sets the tab title for a page: "Name · WestForce", or "Name · Role" when a
 * role is passed (public portfolios).
 * Pass a falsy name to leave the current title alone (for example while data loads).
 */
export default function usePageTitle(name, role = "") {
  useEffect(() => {
    if (name) document.title = formatTitle(name, role);
  }, [name, role]);
}

/**
 * Mount once above the routes. Sets the title from the current path, so every
 * page gets one without its own code. Pages can still refine it with usePageTitle.
 */
export function RouteTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = formatTitle(titleForPath(pathname));
  }, [pathname]);

  return null;
}
