import React from "react";
import SectionTitle from "./SectionTitle";

export default function ExperienceSection({ data }) {
  return (
    <section id="experience" className="portfolio-section">
      <SectionTitle title="Experience" />

      <div className="cv-list">
        {data.map((experience, index) => (
          <article className="cv-entry" key={index}>
            <p className="cv-entry-date">
              {experience.duration || [experience.startDate, experience.endDate].filter(Boolean).join(" – ")}
            </p>

            <div className="cv-entry-body">
              <h3>{experience.position}</h3>

              <p className="cv-entry-org">
                {experience.company}
                {experience.location && (
                  <span className="cv-entry-place">{experience.location}</span>
                )}
              </p>

              {experience.description && (
                <p className="wf-read">{experience.description}</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
