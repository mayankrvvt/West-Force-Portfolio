import React from "react";
import { Download, FileText } from "lucide-react";
import SectionTitle from "./SectionTitle";

export default function ResumeSection({ data }) {
  const hasResume = Boolean(data.url && data.url !== "#");

  return (
    <section id="resume" className="portfolio-section">
      <SectionTitle title="Resume" />

      <div className="portfolio-section-body">
        <div className={`resume-card ${hasResume ? "" : "is-empty"}`}>
          <span className="resume-card-icon" aria-hidden="true">
            <FileText size={24} />
          </span>

          <div className="resume-card-copy">
            <h3>{hasResume ? data.name : "No resume added yet"}</h3>
            <p>
              {hasResume
                ? "Full resume, ready to download"
                : "A resume will show here once one is uploaded."}
            </p>
          </div>

          {hasResume && (
            <a
              href={data.url}
              className="btn btn-primary"
              target="_blank"
              rel="noreferrer"
            >
              <Download size={18} aria-hidden="true" />
              Download resume
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
