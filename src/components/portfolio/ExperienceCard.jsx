export default function ExperienceCard({
  experience = {},
}) {
  return (
    <article className="experience-card">
      <span>
        {experience.period ||
          "2022 — Present"}
      </span>

      <h3>
        {experience.title ||
          "Professional Experience"}
      </h3>

      <p>
        {experience.company ||
          "Company name"}
      </p>

      <p>
        {experience.description ||
          "Experience description."}
      </p>
    </article>
  );
}