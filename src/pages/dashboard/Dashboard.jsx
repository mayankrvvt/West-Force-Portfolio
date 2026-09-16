import { useLayoutEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  FileCheck2,
  FileText,
  LockKeyhole,
  Pencil,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";

import gsap from "gsap";

import useAuth from "../../hooks/useAuth";

export default function Dashboard() {
  const pageRef = useRef(null);

  const { user } = useAuth();

  // ---------------------------------------------------------
  // Portfolio data
  // ---------------------------------------------------------

  const portfolio = useMemo(() => {
    try {
      const stored = localStorage.getItem("westforce_portfolio");

      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, []);

  // ---------------------------------------------------------
  // User information
  // ---------------------------------------------------------

  const fullName =
    portfolio?.fullName ||
    user?.fullName ||
    user?.user_metadata?.full_name ||
    "Demo User";

  const headline =
    portfolio?.headline ||
    "Create your professional profile";

  const summary =
    portfolio?.summary ||
    "Complete your portfolio to showcase your skills, experience and professional journey to employers.";

  const hasPortfolio = Boolean(portfolio);

  // ---------------------------------------------------------
  // Profile completion
  // ---------------------------------------------------------

  const completionItems = [
    {
      label: "Personal information",
      complete: Boolean(portfolio?.fullName),
    },
    {
      label: "Professional headline",
      complete: Boolean(portfolio?.headline),
    },
    {
      label: "Professional summary",
      complete: Boolean(portfolio?.summary),
    },
    {
      label: "Employer passcode",
      complete: Boolean(portfolio?.passcode),
    },
    {
      label: "Resume",
      complete: false,
    },
  ];

  const completedCount = completionItems.filter(
    (item) => item.complete
  ).length;

  const completion = Math.round(
    (completedCount / completionItems.length) * 100
  );

  // Keep the dashboard visually useful while onboarding is
  // still frontend/demo based.
  const displayCompletion = hasPortfolio
    ? Math.max(completion, 72)
    : completion;

  // ---------------------------------------------------------
  // GSAP animations
  // ---------------------------------------------------------

  useLayoutEffect(() => {
    const page = pageRef.current;

    if (!page) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const ctx = gsap.context(() => {
      if (reduceMotion) return;

      gsap.fromTo(
        "[data-dashboard-reveal]",
        {
          opacity: 0,
          y: 25,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
        }
      );

      gsap.fromTo(
        ".dashboard-progress-fill",
        {
          width: "0%",
        },
        {
          width: `${displayCompletion}%`,
          duration: 1.3,
          delay: 0.35,
          ease: "power3.out",
        }
      );
    }, page);

    return () => ctx.revert();
  }, [displayCompletion]);

  // ---------------------------------------------------------
  // Avatar initials
  // ---------------------------------------------------------

  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <div
      ref={pageRef}
      className="dashboard-home"
    >
      {/* =====================================================
          WELCOME
      ====================================================== */}

      <section
        className="dashboard-welcome"
        data-dashboard-reveal
      >
        <div>
          <p className="dashboard-eyebrow">
            YOUR PROFESSIONAL JOURNEY
          </p>

          <h2>
            Welcome back,{" "}
            <span>{fullName.split(" ")[0]}</span> 👋
          </h2>

          <p>
            Keep your profile up to date and make it easier
            for employers to discover you.
          </p>
        </div>

        <Link
          to="/dashboard/profile"
          className="dashboard-primary-button"
        >
          <Pencil size={16} />
          Edit profile
        </Link>
      </section>

      {/* =====================================================
          STATS
      ====================================================== */}

      <section
        className="dashboard-stats"
        data-dashboard-reveal
      >
        {/* Portfolio */}

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon blue">
            <BriefcaseBusiness size={20} />
          </div>

          <div>
            <span>Portfolio</span>

            <strong>
              {hasPortfolio ? "Active" : "Not started"}
            </strong>
          </div>

          <span className="dashboard-stat-status">
            {hasPortfolio ? "Ready" : "Start"}
          </span>
        </div>

        {/* Documents */}

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon purple">
            <FileText size={20} />
          </div>

          <div>
            <span>Documents</span>

            <strong>0</strong>
          </div>

          <span className="dashboard-stat-status">
            Upload
          </span>
        </div>

        {/* Applications */}

        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon green">
            <FileCheck2 size={20} />
          </div>

          <div>
            <span>Applications</span>

            <strong>0</strong>
          </div>

          <span className="dashboard-stat-status">
            Track
          </span>
        </div>
      </section>

      {/* =====================================================
          MAIN GRID
      ====================================================== */}

      <section className="dashboard-main-grid">

        {/* ===================================================
            PORTFOLIO PANEL
        ==================================================== */}

        <article
          className="dashboard-panel portfolio-panel"
          data-dashboard-reveal
        >
          <div className="dashboard-panel-header">
            <div>
              <p className="dashboard-panel-kicker">
                PROFILE
              </p>

              <h3>Your portfolio</h3>
            </div>

            <Link
              to="/dashboard/portfolio"
              className="dashboard-text-link"
            >
              View portfolio
              <ArrowUpRight size={15} />
            </Link>
          </div>

          {/* Mini portfolio preview */}

          <div className="portfolio-mini-preview">
            <div className="portfolio-mini-top">

              <div className="portfolio-mini-avatar">
                {initials}
              </div>

              <div>
                <strong>{fullName}</strong>

                <span>{headline}</span>
              </div>
            </div>

            <p className="portfolio-mini-summary">
              {summary}
            </p>

            <div className="portfolio-mini-footer">

              <div className="portfolio-visibility">
                <span className="status-dot" />
                Public portfolio
              </div>

              <div className="portfolio-protected">
                <LockKeyhole size={14} />
                Protected
              </div>

            </div>
          </div>

          {/* Portfolio actions */}

          <div className="dashboard-panel-actions">

            <Link
              to="/dashboard/portfolio"
              className="dashboard-outline-button"
            >
              Manage portfolio
            </Link>

            <Link
              to="/portfolio/demo-user"
              className="dashboard-primary-button small"
            >
              Open public view
              <ArrowUpRight size={15} />
            </Link>

          </div>
        </article>

        {/* ===================================================
            PROFILE COMPLETION
        ==================================================== */}

        <article
          className="dashboard-panel completion-panel"
          data-dashboard-reveal
        >
          <div className="dashboard-panel-header">

            <div>
              <p className="dashboard-panel-kicker">
                PROFILE STRENGTH
              </p>

              <h3>Profile completion</h3>
            </div>

            <div className="completion-number">
              {displayCompletion}%
            </div>

          </div>

          {/* Progress */}

          <div className="dashboard-progress">
            <div className="dashboard-progress-track">

              <div
                className="dashboard-progress-fill"
                style={{
                  width: `${displayCompletion}%`,
                }}
              />

            </div>
          </div>

          <p className="completion-message">
            {displayCompletion >= 90
              ? "Excellent! Your profile is almost complete."
              : "You're on the right track. Complete a few more sections to stand out."}
          </p>

          {/* Completion checklist */}

          <div className="completion-list">

            {completionItems.map((item) => (
              <div
                className="completion-item"
                key={item.label}
              >
                <span
                  className={
                    item.complete
                      ? "completion-check complete"
                      : "completion-check"
                  }
                >
                  {item.complete && (
                    <Check size={12} />
                  )}
                </span>

                <span>{item.label}</span>

                {!item.complete && (
                  <Link to="/dashboard/profile">
                    Complete
                  </Link>
                )}
              </div>
            ))}

          </div>
        </article>

        {/* ===================================================
            QUICK ACTIONS
        ==================================================== */}

        <article
          className="dashboard-panel quick-actions-panel"
          data-dashboard-reveal
        >
          <div className="dashboard-panel-header">

            <div>
              <p className="dashboard-panel-kicker">
                GET STARTED
              </p>

              <h3>Quick actions</h3>
            </div>

          </div>

          <div className="quick-actions">

            {/* Add documents */}

            <Link
              to="/dashboard/documents"
              className="quick-action"
            >
              <span className="quick-action-icon">
                <Plus size={18} />
              </span>

              <span>
                <strong>Add documents</strong>

                <small>
                  Upload your professional documents
                </small>
              </span>

              <ArrowUpRight size={16} />
            </Link>

            {/* Resume */}

            <Link
              to="/dashboard/resume"
              className="quick-action"
            >
              <span className="quick-action-icon">
                <FileCheck2 size={18} />
              </span>

              <span>
                <strong>Build your resume</strong>

                <small>
                  Create an employer-ready resume
                </small>
              </span>

              <ArrowUpRight size={16} />
            </Link>

            {/* Jobs */}

            <Link
              to="/dashboard/jobs"
              className="quick-action"
            >
              <span className="quick-action-icon">
                <Search size={18} />
              </span>

              <span>
                <strong>Explore jobs</strong>

                <small>
                  Find opportunities matching your profile
                </small>
              </span>

              <ArrowUpRight size={16} />
            </Link>

          </div>
        </article>

        {/* ===================================================
            RECENT ACTIVITY
        ==================================================== */}

        <article
          className="dashboard-panel activity-panel"
          data-dashboard-reveal
        >
          <div className="dashboard-panel-header">

            <div>
              <p className="dashboard-panel-kicker">
                ACTIVITY
              </p>

              <h3>Recent activity</h3>
            </div>

          </div>

          <div className="activity-empty">

            <div className="activity-empty-icon">
              <Sparkles size={20} />
            </div>

            <strong>
              Your activity will appear here
            </strong>

            <p>
              Complete your profile and start using
              WestForce to see your progress here.
            </p>

          </div>
        </article>

      </section>

      {/* =====================================================
          TIP
      ====================================================== */}

      <section
        className="dashboard-tip"
        data-dashboard-reveal
      >
        <div className="dashboard-tip-icon">
          <Sparkles size={20} />
        </div>

        <div>
          <span>WESTFORCE TIP</span>

          <strong>
            A complete profile makes a stronger first
            impression.
          </strong>

          <p>
            Add your resume, skills and certificates to
            give employers a complete picture of your
            experience.
          </p>
        </div>

        <Link to="/dashboard/profile">
          Complete profile
          <ArrowUpRight size={16} />
        </Link>
      </section>
    </div>
  );
}