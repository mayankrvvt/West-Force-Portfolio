import {
  Routes as RouterRoutes,
  Route,
} from "react-router-dom";

// ---------------------------------------------------------
// Public pages
// ---------------------------------------------------------

import Home from "../pages/public/Home";
import Pricing from "../pages/public/Pricing";
import HowItWorks from "../pages/public/HowItWorks";

// ---------------------------------------------------------
// Auth pages
// ---------------------------------------------------------

import SignIn from "../pages/auth/SignIn";
import SignUp from "../pages/auth/SignUp";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";

// ---------------------------------------------------------
// Onboarding
// ---------------------------------------------------------

import Welcome from "../pages/onboarding/Welcome";
import CreatePortfolio from "../pages/onboarding/CreatePortfolio";
import PersonalDetails from "../pages/onboarding/PersonalDetails";
import Documents from "../pages/onboarding/Documents";
import Experience from "../pages/onboarding/Experience";
import Education from "../pages/onboarding/Education";
import Skills from "../pages/onboarding/Skills";
import Certificates from "../pages/onboarding/Certificates";
import ReviewProfile from "../pages/onboarding/ReviewProfile";

// ---------------------------------------------------------
// Dashboard
// ---------------------------------------------------------

import Dashboard from "../pages/dashboard/Dashboard";
import MyPortfolio from "../pages/dashboard/MyPortfolio";
import DashboardDocuments from "../pages/dashboard/Documents";
import Resume from "../pages/dashboard/Resume";
import DashboardCertificates from "../pages/dashboard/Certificates";
import Applications from "../pages/dashboard/Applications";
import Jobs from "../pages/dashboard/Jobs";
import Profile from "../pages/dashboard/Profile";
import Settings from "../pages/dashboard/Settings";

// ---------------------------------------------------------
// Public portfolio
// ---------------------------------------------------------

import PublicPortfolio from "../pages/portfolio/PublicPortfolio";
import PortfolioNotFound from "../pages/portfolio/PortfolioNotFound";

// ---------------------------------------------------------
// Layout / protection
// ---------------------------------------------------------

import ProtectedRoute from "../components/common/ProtectedRoute";
import DashboardLayout from "../components/layout/DashboardLayout";

// ---------------------------------------------------------
// Routes component
// ---------------------------------------------------------

function AppRoutes() {
  return (
    <RouterRoutes>

      {/* =====================================================
          PUBLIC
      ====================================================== */}

      <Route path="/" element={<Home />} />

      <Route
        path="/pricing"
        element={<Pricing />}
      />

      <Route
        path="/how-it-works"
        element={<HowItWorks />}
      />

      {/* =====================================================
          AUTH
      ====================================================== */}

      <Route
        path="/auth/sign-in"
        element={<SignIn />}
      />

      <Route
        path="/auth/sign-up"
        element={<SignUp />}
      />

      <Route
        path="/auth/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/auth/reset-password"
        element={<ResetPassword />}
      />

      {/* =====================================================
          PROTECTED ROUTES
      ====================================================== */}

      <Route element={<ProtectedRoute />}>

        {/* ---------------------------------------------------
            ONBOARDING
        ---------------------------------------------------- */}

        <Route
          path="/onboarding/welcome"
          element={<Welcome />}
        />

        <Route
          path="/onboarding/create-portfolio"
          element={<CreatePortfolio />}
        />

        <Route
          path="/onboarding/personal-details"
          element={<PersonalDetails />}
        />

        <Route
          path="/onboarding/documents"
          element={<Documents />}
        />

        <Route
          path="/onboarding/experience"
          element={<Experience />}
        />

        <Route
          path="/onboarding/education"
          element={<Education />}
        />

        <Route
          path="/onboarding/skills"
          element={<Skills />}
        />

        <Route
          path="/onboarding/certificates"
          element={<Certificates />}
        />

        <Route
          path="/onboarding/review-profile"
          element={<ReviewProfile />}
        />

        {/* =================================================
            DASHBOARD LAYOUT

            IMPORTANT:
            DashboardLayout appears ONLY ONCE.

            All dashboard pages render inside its Outlet.
        ================================================== */}

        <Route element={<DashboardLayout />}>

          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/dashboard/portfolio"
            element={<MyPortfolio />}
          />

          <Route
            path="/dashboard/documents"
            element={<DashboardDocuments />}
          />

          <Route
            path="/dashboard/resume"
            element={<Resume />}
          />

          <Route
            path="/dashboard/certificates"
            element={<DashboardCertificates />}
          />

          <Route
            path="/dashboard/applications"
            element={<Applications />}
          />

          <Route
            path="/dashboard/jobs"
            element={<Jobs />}
          />

          <Route
            path="/dashboard/profile"
            element={<Profile />}
          />

          <Route
            path="/dashboard/settings"
            element={<Settings />}
          />

        </Route>

      </Route>

      {/* =====================================================
          PUBLIC PORTFOLIO
      ====================================================== */}

      <Route
        path="/portfolio/:slug"
        element={<PublicPortfolio />}
      />

      {/* Portfolio not found */}

      <Route
        path="/portfolio-not-found"
        element={<PortfolioNotFound />}
      />

      {/* =====================================================
          FALLBACK
      ====================================================== */}

      <Route
        path="*"
        element={<PortfolioNotFound />}
      />

    </RouterRoutes>
  );
}

// ---------------------------------------------------------
// DEFAULT EXPORT
// ---------------------------------------------------------

export default AppRoutes;