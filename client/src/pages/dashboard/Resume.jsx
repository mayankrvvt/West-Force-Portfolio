import React, { useEffect, useState } from "react";

import { apiRequest } from "../../utils/api";

export default function Resume() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPortfolio() {
      try {
        setLoading(true);
        setError("");

        const result = await apiRequest(
          "/api/portfolios/me"
        );

        setPortfolio(
          result.portfolio ||
          result.data ||
          result
        );
      } catch (err) {
        console.error(
          "Failed to load resume:",
          err
        );

        setError(
          err.message ||
            "Unable to load resume."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPortfolio();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="dashboard-loading-spinner" />
          <h2>Loading resume...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-error">
          <h2>Unable to load resume</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const resume = portfolio?.resume;

  if (!resume?.fileUrl) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-page-header">
          <div>
            <span className="dashboard-eyebrow">
              WESTFORCE PORTFOLIO
            </span>

            <h1>Resume</h1>

            <p>
              Manage your uploaded resume.
            </p>
          </div>
        </div>

        <div className="dashboard-empty">
          <h2>No resume uploaded</h2>

          <p>
            Upload your resume from the
            portfolio builder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-page-header">
        <div>
          <span className="dashboard-eyebrow">
            WESTFORCE PORTFOLIO
          </span>

          <h1>Resume</h1>

          <p>
            Your uploaded resume.
          </p>
        </div>
      </div>

      <div className="dashboard-card">
        <div className="dashboard-card-header">
          <div>
            <h2>
              {resume.name || "Resume"}
            </h2>

            <p>
              Your resume is stored securely
              and available through Cloudinary.
            </p>
          </div>

          <a
            href={resume.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="dashboard-primary-button"
          >
            Open Resume
          </a>
        </div>

        <div
          style={{
            marginTop: "24px",
            width: "100%",
            minHeight: "700px",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid #e2e7ef",
          }}
        >
          <iframe
            src={resume.fileUrl}
            title="Resume Preview"
            style={{
              width: "100%",
              height: "700px",
              border: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
}