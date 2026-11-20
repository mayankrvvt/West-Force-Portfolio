import React from "react";
import { FileText } from "lucide-react";
import SectionTitle from "./SectionTitle";

export default function ResumeSection({ data }) {
  return (
    <section id="resume" className="portfolio-section">
      <SectionTitle title="Resume" />

      <div className="resume-card">
        <FileText className="resume-card-icon" size={28} aria-hidden="true" />

        <div className="resume-card-copy">
          <h3>{data.name}</h3>
          <p>Full resume</p>
        </div>

        {data.url && data.url !== "#" ? (
          <a
            href={data.url}
            className="btn btn-primary"
            target="_blank"
            rel="noreferrer"
          >
            Download resume
          </a>
        ) : (
          <span className="btn btn-secondary" aria-disabled="true">
            Resume not added yet
          </span>
        )}
      </div>
    </section>
  );
}
