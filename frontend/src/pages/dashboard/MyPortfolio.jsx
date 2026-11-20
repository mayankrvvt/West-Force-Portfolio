import { useEffect, useState } from "react";
import {
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Globe2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BriefcaseBusiness,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { apiRequest } from "../../utils/api";
import PageSkeleton from "../../components/dashboard/Skeleton";
import PortfolioViewsCard from "../../components/dashboard/PortfolioViewsCard";
import { useApp } from "../../app/providers";
import useEntitlement from "../../hooks/useEntitlement";

import DynamicPortfolioTemplate from "../../components/portfolio/DynamicPortfolioTemplate.jsx";

import "../../styles/portfolio.css";
import "../../styles/portfolio-viewer.css";

export default function MyPortfolio() {
  const navigate = useNavigate();
  const { openPaymentModal } = useApp();
  const {
    isPaid,
    loading: entitlementLoading,
  } = useEntitlement();

  const [portfolio, setPortfolio] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [publishing, setPublishing] =
    useState(false);

  const [message, setMessage] =
    useState("");

  /*
   * Controls the right-side portfolio toolbar.
   *
   * false = expanded
   * true  = collapsed
   */
  const [toolbarCollapsed, setToolbarCollapsed] =
    useState(true);


  /* =========================================================
     LOAD PORTFOLIO
  ========================================================= */

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      setError("");

      const result = await apiRequest(
        "/api/portfolios/me"
      );

      setPortfolio(
        result?.portfolio ||
        result?.data ||
        result
      );

    } catch (err) {
      console.error(
        "Failed to load portfolio:",
        err
      );

      setError(
        err.message ||
        "Unable to load your portfolio."
      );

    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadPortfolio();
  }, []);


  /* =========================================================
     PUBLIC URL
  ========================================================= */

  const publicUrl =
    portfolio?.slug && portfolio.status === "published"
      ? `${window.location.origin}/portfolio/${portfolio.slug}`
      : "";


  /* =========================================================
     COPY PUBLIC LINK
  ========================================================= */

  const copyLink = async () => {
    if (!publicUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        publicUrl
      );

      setMessage(
        "Portfolio link copied."
      );

    } catch {
      window.prompt(
        "Copy your portfolio link:",
        publicUrl
      );
    }

    setTimeout(() => {
      setMessage("");
    }, 2500);
  };


  /* =========================================================
     PUBLISH PORTFOLIO
  ========================================================= */

  const publish = async () => {
    if (!isPaid) {
      openPaymentModal(
        "Choose a plan to publish your portfolio and share its public link."
      );
      return;
    }

    try {
      setPublishing(true);

      const result =
        await apiRequest(
          "/api/portfolios/me",
          {
            method: "PUT",

            body: JSON.stringify({
              status: "published",
            }),
          }
        );

      const updated =
        result?.portfolio ||
        result?.data ||
        result;

      setPortfolio(updated);


      if (updated?.slug) {
        const url =
          `${window.location.origin}/portfolio/${updated.slug}`;

        try {
          await navigator.clipboard.writeText(
            url
          );
        } catch {
          // Clipboard may be unavailable.
        }
      }


      setMessage(
        "Portfolio published. Public link copied."
      );

      setTimeout(() => {
        setMessage("");
      }, 3000);

    } catch (err) {
      if (err.status === 402) {
        openPaymentModal(
          "Choose a plan to publish your portfolio and share its public link."
        );
        return;
      }

      console.error(
        "Publish error:",
        err
      );

      setMessage(
        err.message ||
        "Could not publish portfolio."
      );

    } finally {
      setPublishing(false);
    }
  };

  const downloadPortfolio = () => {
    if (!isPaid) {
      openPaymentModal(
        "Choose a plan to download your portfolio as a PDF."
      );
      return;
    }

    window.print();
  };


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="dashboard-product">
        <PageSkeleton
          layout="preview"
          label="Loading your portfolio"
        />
      </div>
    );
  }


  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div className="dashboard-product">

        <div className="empty-product" role="alert">

          <h2>
            Unable to load portfolio
          </h2>

          <p>
            {error}
          </p>

          <button
            className="product-button primary"
            onClick={loadPortfolio}
          >
            Try again
          </button>

        </div>

      </div>
    );
  }


  /* =========================================================
     NO PORTFOLIO
  ========================================================= */

  if (!portfolio) {
    return (
      <div className="dashboard-product">

        <div className="empty-product">

          <h2>
            Nothing here yet
          </h2>

          <p>
            Create your portfolio to see it here.
          </p>

          <button
            className="product-button primary"
            onClick={() =>
              navigate(
                "/onboarding/create-portfolio"
              )
            }
          >
            Create portfolio
          </button>

        </div>

      </div>
    );
  }


  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div
      className={
        `dashboard-product ${
          toolbarCollapsed
            ? "portfolio-toolbar-is-collapsed"
            : ""
        }`
      }
    >

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <header className="product-page-header">

        <div>

          <h1 className="product-title-with-badge">
            My portfolio
            <span className={`status-badge ${portfolio.status === "published" ? "status-offer" : "status-saved"}`}>
              {portfolio.status === "published" ? "Published" : "Draft"}
            </span>
          </h1>

          <p>
            Edit, publish, share and download
            the portfolio generated from your
            saved profile.
          </p>

        </div>


        <div className="product-actions">

          <button
            className="product-button"
            onClick={() =>
              navigate(
                "/onboarding/create-portfolio"
              )
            }
          >
            <Edit3 size={16} aria-hidden="true" />

            Edit
          </button>


          {portfolio.slug && (
            <a
              className="product-button"
              href={`/portfolio/${portfolio.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} aria-hidden="true" />

              View public page
            </a>
          )}

        </div>

      </header>


      {/* =====================================================
          NOTICE
      ===================================================== */}

      {message && (
        <div className="product-notice">

          <Globe2 size={16} aria-hidden="true" />

          <span>
            {message}
          </span>

        </div>
      )}


      {/* =====================================================
          PORTFOLIO + TOOLBAR
      ===================================================== */}

      <div
        className={
          `portfolio-dashboard-layout ${
            toolbarCollapsed
              ? "toolbar-collapsed"
              : ""
          }`
        }
      >


        {/* ===================================================
            PORTFOLIO VIEWER
        =================================================== */}

        <section className="portfolio-viewer-wrapper">

          <div className="portfolio-viewer">

            <DynamicPortfolioTemplate
              portfolio={portfolio}
            />

          </div>

        </section>


        {/* ===================================================
            RIGHT TOOLBAR
        =================================================== */}

        <aside
          className={
            `dashboard-toolbar ${
              toolbarCollapsed
                ? "collapsed"
                : ""
            }`
          }
        >


          {/* ===============================================
              COLLAPSE BUTTON
          =============================================== */}

          <button
            type="button"
            className="toolbar-collapse-button"
            onClick={() =>
              setToolbarCollapsed(
                (current) => !current
              )
            }
            aria-label={
              toolbarCollapsed
                ? "Expand portfolio tools"
                : "Collapse portfolio tools"
            }
            title={
              toolbarCollapsed
                ? "Expand tools"
                : "Collapse tools"
            }
          >

            {toolbarCollapsed ? (
              <ChevronLeft size={20} />
            ) : (
              <ChevronRight size={20} />
            )}

          </button>


          {/* ===============================================
              EXPANDED TOOLBAR
          =============================================== */}

          {!toolbarCollapsed && (
            <>

              <div className="toolbar-card">

                <h3>
                  {portfolio.profile?.name
                    ? portfolio.profile.name
                    : "Your portfolio"}
                </h3>

                <p>
                  Edit, publish, share or
                  download your portfolio.
                </p>

              </div>


              {/* EDIT */}

              <button
                type="button"
                className="toolbar-button"
                onClick={() =>
                  navigate(
                    "/onboarding/create-portfolio"
                  )
                }
              >

                <span>
                  <Edit3 size={19} />
                </span>

                <div>

                  <strong>
                    Edit portfolio
                  </strong>

                  <small>
                    Update your information
                  </small>

                </div>

              </button>


              {/* PUBLISH */}

              <button
                type="button"
                className={
                  `toolbar-button ${
                    portfolio.status !== "published"
                      ? "toolbar-highlight"
                      : ""
                  }`
                }
                onClick={publish}
                disabled={publishing || entitlementLoading}
              >

                <span>
                  <Globe2 size={19} />
                </span>

                <div>

                  <strong>
                    {publishing
                      ? "Publishing..."
                      : "Publish portfolio"}
                  </strong>

                  <small>
                    {portfolio.status ===
                    "published"
                      ? "Refresh public version"
                      : "Make your portfolio public"}
                  </small>

                </div>

              </button>


              {/* COPY LINK */}

              <button
                type="button"
                className="toolbar-button"
                onClick={copyLink}
                disabled={!publicUrl}
              >

                <span>
                  <Copy size={19} />
                </span>

                <div>

                  <strong>
                    Copy public link
                  </strong>

                  <small>
                    {publicUrl
                      ? "Share your portfolio URL"
                      : "Add a portfolio slug first"}
                  </small>

                </div>

              </button>


              {/* DOWNLOAD */}

              <button
                type="button"
                className="toolbar-button"
                onClick={downloadPortfolio}
              >

                <span>
                  <Download size={19} />
                </span>

                <div>

                  <strong>
                    Download portfolio
                  </strong>

                  <small>
                    Print or save as PDF
                  </small>

                </div>

              </button>


              <div className="toolbar-divider" />


              {/* AI */}

              <button
                type="button"
                className="toolbar-button"
                onClick={() =>
                  navigate("/dashboard/resume-builder")
                }
              >
                <span>
                  <Sparkles size={19} />
                </span>
                <div>
                  <strong>AI resume builder</strong>
                  <small>Write or improve your resume</small>
                </div>
              </button>


              {/* JOBS */}

              <button
                type="button"
                className="toolbar-button"
                onClick={() =>
                  navigate("/dashboard/applications")
                }
              >
                <span>
                  <BriefcaseBusiness size={19} />
                </span>
                <div>
                  <strong>Job applications</strong>
                  <small>Track where you have applied</small>
                </div>
              </button>

            </>
          )}


          {/* ===============================================
              COLLAPSED TOOLBAR
          =============================================== */}

          {toolbarCollapsed && (
            <div className="toolbar-collapsed-icons">

              <button
                type="button"
                title="Edit portfolio"
                aria-label="Edit portfolio"
                onClick={() =>
                  navigate(
                    "/onboarding/create-portfolio"
                  )
                }
              >
                <Edit3 size={19} />
              </button>


              <button
                type="button"
                title="Publish portfolio"
                aria-label="Publish portfolio"
                onClick={publish}
              >
                <Globe2 size={19} />
              </button>


              <button
                type="button"
                title="Copy public link"
                aria-label="Copy public link"
                onClick={copyLink}
                disabled={!publicUrl}
              >
                <Copy size={19} />
              </button>


              <button
                type="button"
                title="Download portfolio"
                aria-label="Download portfolio"
                onClick={downloadPortfolio}
              >
                <Download size={19} />
              </button>


              <div className="toolbar-collapsed-divider" />


              <button
                type="button"
                title="AI resume builder"
                aria-label="Open the AI resume builder"
                onClick={() =>
                  navigate("/dashboard/resume-builder")
                }
              >
                <Sparkles size={19} />
              </button>


              <button
                type="button"
                title="Job applications"
                aria-label="Open job applications"
                onClick={() =>
                  navigate("/dashboard/applications")
                }
              >
                <BriefcaseBusiness size={19} />
              </button>

            </div>
          )}

        </aside>

      </div>

      {/* =====================================================
          PORTFOLIO VIEWS
      ===================================================== */}

      {portfolio && <PortfolioViewsCard />}

    </div>
  );
}