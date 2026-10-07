import {
  Routes as RouterRoutes,
  Route,
  Navigate,
} from "react-router-dom";
import { lazy } from "react";

const Home = lazy(() => import("../pages/public/Home"));
const Pricing = lazy(() => import("../pages/public/Pricing"));
const HowItWorks = lazy(() => import("../pages/public/HowItWorks"));
const SignIn = lazy(() => import("../pages/auth/SignIn"));
const SignUp = lazy(() => import("../pages/auth/SignUp"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const PaymentSuccess = lazy(() => import("../pages/payment/PaymentSuccess"));
const PaymentCancelled = lazy(() => import("../pages/payment/PaymentCancelled"));
const Welcome = lazy(() => import("../pages/onboarding/Welcome"));
const CreatePortfolio = lazy(() => import("../pages/onboarding/CreatePortfolio"));
const PersonalDetails = lazy(() => import("../pages/onboarding/PersonalDetails"));
const Documents = lazy(() => import("../pages/onboarding/Documents"));
const Experience = lazy(() => import("../pages/onboarding/Experience"));
const Education = lazy(() => import("../pages/onboarding/Education"));
const Skills = lazy(() => import("../pages/onboarding/Skills"));
const Certificates = lazy(() => import("../pages/onboarding/Certificates"));
const ReviewProfile = lazy(() => import("../pages/onboarding/ReviewProfile"));
const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));
const MyPortfolio = lazy(() => import("../pages/dashboard/MyPortfolio"));
const DashboardDocuments = lazy(() => import("../pages/dashboard/Documents"));
const AIResumeBuilder = lazy(() => import("../pages/dashboard/AIResumeBuilder"));
const ATSChecker = lazy(() => import("../pages/dashboard/ATSChecker"));
const Resumes = lazy(() => import("../pages/dashboard/Resumes"));
const DashboardCertificates = lazy(() => import("../pages/dashboard/Certificates"));
const Applications = lazy(() => import("../pages/dashboard/Applications"));
const Jobs = lazy(() => import("../pages/dashboard/Jobs"));
const Profile = lazy(() => import("../pages/dashboard/Profile"));
const Settings = lazy(() => import("../pages/dashboard/Settings"));
const ResumeEditor = lazy(() => import("../pages/dashboard/ResumeEditor"));
const PublicPortfolio = lazy(() => import("../pages/portfolio/PublicPortfolio"));
const PortfolioNotFound = lazy(() => import("../pages/portfolio/PortfolioNotFound"));

// ---------------------------------------------------------
// Protection
// ---------------------------------------------------------

import ProtectedRoute from "../components/common/ProtectedRoute";
import PaidAccessRoute from "../components/common/PaidAccessRoute";
import DashboardLayout from "../components/layout/DashboardLayout";

// ---------------------------------------------------------
// Routes
// ---------------------------------------------------------

function AppRoutes() {
  return (
    <RouterRoutes>

      {/* =====================================================
          PUBLIC
      ====================================================== */}

      <Route
        path="/"
        element={<Home />}
      />

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
          PAYMENT
      ====================================================== */}

      <Route
        path="/payment/success"
        element={<PaymentSuccess />}
      />

      <Route
        path="/payment/cancelled"
        element={<PaymentCancelled />}
      />

      {/* =====================================================
          PROTECTED
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

        {/* ---------------------------------------------------
            DASHBOARD
        ---------------------------------------------------- */}

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
            path="/dashboard/resume"
            element={<Navigate to="/dashboard/resumes" replace />}
          />

          <Route element={<PaidAccessRoute />}>
            <Route
              path="/dashboard/documents"
              element={<DashboardDocuments />}
            />

            <Route
              path="/dashboard/resume-builder"
              element={<AIResumeBuilder />}
            />

            <Route
              path="/dashboard/resume-editor"
              element={<ResumeEditor />}
            />

            <Route
              path="/dashboard/ats-checker"
              element={<ATSChecker />}
            />

            <Route
              path="/dashboard/resumes"
              element={<Resumes />}
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
          </Route>

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

export default AppRoutes;