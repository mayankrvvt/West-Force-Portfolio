import React from "react";
import SectionTitle from "./SectionTitle";

export default function EducationSection({ data }) {
  return (
    <section id="education" className="portfolio-section">
      <SectionTitle title="Education" />

      <div className="portfolio-section-body cv-list">
        {data.map((education, index) => (
          <article
            className="cv-entry"
            key={`${education.institution}-${education.degree}-${index}`}
          >
            <div className="cv-entry-body">
              <h3>{education.degree}</h3>

              <p className="cv-entry-org">
                {education.institution}
                {education.fieldOfStudy && (
                  <span className="cv-entry-place">
                    {education.fieldOfStudy}
                  </span>
                )}
              </p>

              {education.description && (
                <p className="cv-entry-text">{education.description}</p>
              )}
            </div>

            {education.year && (
              <p className="cv-entry-date">{education.year}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
