import React from "react";
import SectionTitle from "./SectionTitle";

export default function ExperienceSection({ data }) {
  return (
    <section id="experience" className="portfolio-section">
      <SectionTitle
        eyebrow="EXPERIENCE"
        title="Professional Details"
        description="My professional experience and career history."
      />

      <div className="experience-list">
        {data.map((experience, index) => (
          <article className="experience-card" key={index}>
            <div className="experience-date">
              <span>{experience.duration || `${experience.startDate || ""} — ${experience.endDate || ""}`}</span>
            </div>

            <div className="experience-content">
              <h3>{experience.position}</h3>

              <h4>
                {experience.company}
              </h4>

              {experience.location && (
                <span className="experience-location">
                  📍 {experience.location}
                </span>
              )}

              <p>{experience.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
