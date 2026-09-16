import React from "react";
import SectionTitle from "./SectionTitle";

export default function ResumeSection({ data }) {
  return (
    <section id="resume" className="portfolio-section resume-section">
      <SectionTitle
        eyebrow="RESUME"
        title="My Resume"
        description="Download my complete professional resume."
      />

      <div className="resume-card">
        <div className="resume-icon">
          PDF
        </div>

        <div>
          <h3>{data.name}</h3>
          <p>Professional Resume</p>
        </div>

        {data.url && data.url !== "#" ? (
          <a
            href={data.url}
            className="primary-button"
            target="_blank"
            rel="noreferrer"
          >
            Download Resume
          </a>
        ) : (
          <span className="primary-button document-button-disabled" aria-disabled="true">
            Resume unavailable
          </span>
        )}
      </div>
    </section>
  );
}
