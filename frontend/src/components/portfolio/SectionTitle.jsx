import React from "react";

export default function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="portfolio-section-heading">
      {eyebrow && (
        <div className="section-eyebrow">
          <span></span>
          {eyebrow}
        </div>
      )}
      <div className="section-title-row">
        <h2>{title}</h2>
        <span className="section-number" aria-hidden="true">/</span>
      </div>
      {description && <p>{description}</p>}
    </div>
  );
}
