import React from "react";
import SectionTitle from "./SectionTitle";

export default function DocumentsSection({ data }) {
  return (
    <section id="documents" className="portfolio-section">
      <SectionTitle
        eyebrow="DOCUMENTS"
        title="My Documents"
        description="Verified documents and professional credentials."
      />

      <div className="documents-grid">
        {data.map((document, index) => (
          <div className="document-card" key={index}>
            <div className="document-icon">
              PDF
            </div>

            <div className="document-content">
              <h3>{document.name}</h3>

              <p>
                {document.type}{document.size ? ` · ${document.size}` : ""}
              </p>
            </div>

            {document.url ? (
              <a
                href={document.url}
                className="document-button"
                target="_blank"
                rel="noreferrer"
              >
                View
              </a>
            ) : (
              <span className="document-button document-button-disabled" aria-disabled="true">
                Unavailable
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
