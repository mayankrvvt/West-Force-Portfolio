import React from "react";
import SectionTitle from "./SectionTitle";

export default function SkillsSection({ data }) {
  return (
    <section id="skills" className="portfolio-section alternate-section">
      <SectionTitle
        eyebrow="SKILLS"
        title="My Skills"
        description="Professional skills and areas of expertise."
      />

      <div className="skills-grid">
        {data.map((skill) => {
          const name = typeof skill === "string" ? skill : skill.name;
          const level = typeof skill === "string" ? null : skill.level;

          return (
          <div className="skill-card" key={name}>
            <div className="skill-header">
              <h3>{name}</h3>

              {level != null && <span>{level}%</span>}
            </div>

            {level != null && (
              <div className="skill-progress">
                <div
                  className="skill-progress-value"
                  style={{ width: `${level}%` }}
                ></div>
              </div>
            )}
          </div>
          );
        })}
      </div>
    </section>
  );
}
