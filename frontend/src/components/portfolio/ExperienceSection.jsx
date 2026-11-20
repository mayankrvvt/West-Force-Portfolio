import React from "react";
import SectionTitle from "./SectionTitle";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/* "2023-03" or "2023-03-01" becomes { year, month }; anything else is kept as text. */
function parseMonth(value) {
  const match = /^(\d{4})-(\d{2})/.exec(String(value || ""));

  if (!match) return null;

  const month = Number(match[2]);

  if (month < 1 || month > 12) return null;

  return { year: Number(match[1]), month };
}

function formatMonth(value) {
  const parsed = parseMonth(value);

  if (!parsed) return value || "";

  return `${MONTHS[parsed.month - 1]} ${parsed.year}`;
}

/* Length of a role, like "2 yrs 3 mos". Empty when the dates can't be read. */
function formatLength(start, end) {
  const from = parseMonth(start);

  if (!from) return "";

  const now = new Date();
  const to = parseMonth(end) || {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  };

  const total = (to.year - from.year) * 12 + (to.month - from.month) + 1;

  if (total <= 0) return "";

  const years = Math.floor(total / 12);
  const months = total % 12;
  const parts = [];

  if (years) parts.push(`${years} ${years === 1 ? "yr" : "yrs"}`);
  if (months) parts.push(`${months} ${months === 1 ? "mo" : "mos"}`);

  return parts.join(" ");
}

function dateRange(experience) {
  if (experience.duration) return experience.duration;

  const start = formatMonth(experience.startDate);
  const end = experience.isCurrent
    ? "Present"
    : formatMonth(experience.endDate);

  return [start, end].filter(Boolean).join(" – ");
}

export default function ExperienceSection({ data }) {
  return (
    <section id="experience" className="portfolio-section">
      <SectionTitle title="Experience" />

      <ol className="portfolio-section-body timeline">
        {data.map((experience, index) => {
          const length = experience.duration
            ? ""
            : formatLength(
                experience.startDate,
                experience.isCurrent ? "" : experience.endDate
              );

          return (
            <li
              className={`timeline-item ${
                experience.isCurrent ? "is-current" : ""
              }`}
              key={`${experience.company}-${experience.startDate}-${index}`}
            >
              <span className="timeline-marker" aria-hidden="true" />

              <div className="timeline-head">
                <h3>{experience.position}</h3>

                {experience.isCurrent && (
                  <span className="timeline-badge">Current</span>
                )}
              </div>

              <p className="timeline-org">
                {experience.company}
                {experience.location && (
                  <span className="timeline-place">
                    {experience.location}
                  </span>
                )}
              </p>

              <p className="timeline-date">
                {dateRange(experience)}
                {length && (
                  <span className="timeline-length">{length}</span>
                )}
              </p>

              {experience.description && (
                <p className="timeline-text">{experience.description}</p>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
