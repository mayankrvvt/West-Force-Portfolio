import React from "react";
import SectionTitle from "./SectionTitle";

/* Skill levels are a self rating, so the public page lists names only. */
export default function SkillsSection({ data }) {
  const names = data
    .map((skill) => (typeof skill === "string" ? skill : skill.name))
    .filter(Boolean);

  return (
    <section id="skills" className="portfolio-section">
      <SectionTitle title="Skills" />

      <ul className="portfolio-section-body skills-list">
        {names.map((name, index) => (
          <li className="skill-item" key={`${name}-${index}`}>
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}
