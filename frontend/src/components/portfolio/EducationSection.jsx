import React from "react";
import SectionTitle from "./SectionTitle";

export default function EducationSection({ data }) {
  return (
    <section id="education" className="portfolio-section alternate-section">
      <SectionTitle
        eyebrow="EDUCATION"
        title="Education Details"
        description="My academic background and professional education."
      />

      <div className="timeline">
        {data.map((education, index) => (
          <div className="timeline-item" key={index}>
            <div className="timeline-dot"></div>

            <div className="timeline-card">
              <span className="timeline-year">
                {education.year}
              </span>

              <h3>{education.degree}</h3>

              <h4>{education.institution}</h4>

              <p>{education.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}