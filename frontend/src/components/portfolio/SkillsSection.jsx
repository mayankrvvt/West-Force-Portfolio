import React from "react";
import SectionTitle from "./SectionTitle";

export default function SkillsSection({ data }) {
  return (
    <section id="skills" className="portfolio-section">
      <SectionTitle title="Skills" />

      <ul className="skills-list">
        {data.map((skill) => {
          const name = typeof skill === "string" ? skill : skill.name;
          const level = typeof skill === "string" ? null : skill.level;

          return (
            <li className="skill-item" key={name}>
              <span>{name}</span>
              {level != null && level !== "" && (
                <span className="skill-level">{level}%</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
