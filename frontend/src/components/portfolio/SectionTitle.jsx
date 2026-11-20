import React from "react";

/* `eyebrow` is accepted for older callers but no longer shown. */
// eslint-disable-next-line no-unused-vars
export default function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="portfolio-section-heading">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}
