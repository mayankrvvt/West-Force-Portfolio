const industries = [
  "Construction",
  "Healthcare",
  "Logistics",
  "Hospitality",
  "Skilled trades",
  "Manufacturing",
  "Transportation",
  "Professional services",
];

export default function EmployerShowcase() {
  return (
    <section className="home-section" aria-labelledby="industries-title">
      <div className="container home-split">
        <div className="home-section-head">
          <h2 id="industries-title">
            Show employers the whole picture
          </h2>

          <p>
            Give employers a clear, professional view of your
            skills, experience and credentials from one
            shareable profile.
          </p>
        </div>

        <div>
          <p className="home-list-label">
            Built for job seekers in
          </p>

          <ul className="industry-list">
            {industries.map((industry) => (
              <li key={industry}>{industry}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
