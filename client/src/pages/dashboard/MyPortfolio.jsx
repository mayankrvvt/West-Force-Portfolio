import { useEffect, useState } from "react";
import {
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Globe2,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { apiRequest } from "../../utils/api";

import DynamicPortfolioTemplate from "../../components/portfolio/DynamicPortfolioTemplate.jsx";

import "../../styles/portfolio.css";
import "../../styles/portfolio-viewer.css";

export default function MyPortfolio() {
  const navigate = useNavigate();

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
    portfolio?.slug
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


  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="dashboard-product">
        <div className="empty-product">
          Loading your portfolio...
        </div>
      </div>
    );
  }


  /* =========================================================
     ERROR
  ========================================================= */

  if (error) {
    return (
      <div className="dashboard-product">

        <div className="empty-product">

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
            No portfolio found
          </h2>

          <p>
            Create your portfolio first.
          </p>

          <button
            className="product-button primary"
            onClick={() =>
              navigate(
                "/onboarding/create-portfolio"
              )
            }
          >
            Create Portfolio
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

          <span className="product-eyebrow">
            OVERVIEW
          </span>

          <h1>
            My Portfolio
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
            <Edit3 size={15} />

            Edit
          </button>


          {portfolio.slug && (
            <a
              className="product-button"
              href={`/portfolio/${portfolio.slug}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={15} />

              Open public
            </a>
          )}

        </div>

      </header>


      {/* =====================================================
          NOTICE
      ===================================================== */}

      {message && (
        <div className="product-notice">

          <Globe2 size={15} />

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

                <span className="toolbar-label">
                  PORTFOLIO
                </span>

                <h3>
                  {portfolio.profile?.name
                    ? portfolio.profile.name
                    : "Your Portfolio"}
                </h3>

                <p>
                  Manage your public portfolio
                  and keep your professional
                  presence ready to share.
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
                    Edit Portfolio
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
                disabled={publishing}
              >

                <span>
                  <Globe2 size={19} />
                </span>

                <div>

                  <strong>
                    {publishing
                      ? "Publishing..."
                      : "Publish Portfolio"}
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
                    Copy Public Link
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
                onClick={() =>
                  window.print()
                }
              >

                <span>
                  <Download size={19} />
                </span>

                <div>

                  <strong>
                    Download Portfolio
                  </strong>

                  <small>
                    Print or save as PDF
                  </small>

                </div>

              </button>


              {/* ADD SECTION */}

              <button
                type="button"
                className="toolbar-button"
                onClick={() =>
                  window.alert(
                    "Add Section is ready for the next builder module."
                  )
                }
              >

                <span>
                  <Plus size={20} />
                </span>

                <div>

                  <strong>
                    Add Section
                  </strong>

                  <small>
                    Expand your portfolio
                  </small>

                </div>

              </button>


              <div className="toolbar-divider" />


              {/* AI */}

              <div className="toolbar-coming-soon">

                <span>
                  AI
                </span>

                <div>

                  <strong>
                    AI Resume Tools
                  </strong>

                  <small>
                    Available in sidebar
                  </small>

                </div>

              </div>


              {/* JOBS */}

              <div className="toolbar-coming-soon">

                <span>
                  JOB
                </span>

                <div>

                  <strong>
                    Job Applications
                  </strong>

                  <small>
                    Track from Applications
                  </small>

                </div>

              </div>

            </>
          )}


          {/* ===============================================
              COLLAPSED TOOLBAR
          =============================================== */}

          {toolbarCollapsed && (
            <div className="toolbar-collapsed-icons">

              <button
                type="button"
                title="Edit Portfolio"
                aria-label="Edit Portfolio"
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
                title="Publish Portfolio"
                aria-label="Publish Portfolio"
                onClick={publish}
              >
                <Globe2 size={19} />
              </button>


              <button
                type="button"
                title="Copy Public Link"
                aria-label="Copy Public Link"
                onClick={copyLink}
                disabled={!publicUrl}
              >
                <Copy size={19} />
              </button>


              <button
                type="button"
                title="Download Portfolio"
                aria-label="Download Portfolio"
                onClick={() =>
                  window.print()
                }
              >
                <Download size={19} />
              </button>


              <button
                type="button"
                title="Add Section"
                aria-label="Add Section"
                onClick={() =>
                  window.alert(
                    "Add Section is ready for the next builder module."
                  )
                }
              >
                <Plus size={20} />
              </button>


              <div className="toolbar-collapsed-divider" />


              <button
                type="button"
                className="toolbar-ai-icon"
                title="AI Resume Tools"
                aria-label="AI Resume Tools"
              >
                AI
              </button>


              <button
                type="button"
                className="toolbar-job-icon"
                title="Job Applications"
                aria-label="Job Applications"
              >
                JOB
              </button>

            </div>
          )}

        </aside>

      </div>

    </div>
  );
}