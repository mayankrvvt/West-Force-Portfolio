import React from "react";
import SectionTitle from "./SectionTitle";

export default function EducationSection({ data }) {
  return (
    <section id="education" className="portfolio-section">
      <SectionTitle title="Education" />

      <div className="cv-list">
        {data.map((education, index) => (
          <article className="cv-entry" key={index}>
            <p className="cv-entry-date">{education.year}</p>

            <div className="cv-entry-body">
              <h3>{education.degree}</h3>

              <p className="cv-entry-org">{education.institution}</p>

              {education.description && (
                <p className="wf-read">{education.description}</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
