export default function SkillCard({
  skill = "Skill",
  level = "Intermediate",
}) {
  return (
    <div className="skill-card">
      <span>{skill}</span>

      <small>{level}</small>
    </div>
  );
}