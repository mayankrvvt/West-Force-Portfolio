export default function PortfolioPreview({
  profile = {},
}) {
  return (
    <div className="portfolio-preview">
      <div className="portfolio-cover">
        WESTFORCE PORTFOLIO
      </div>

      <div className="portfolio-profile">
        <div className="avatar">
          {profile.name?.charAt(0) || "C"}
        </div>

        <h2>
          {profile.name || "Candidate Name"}
        </h2>

        <p>
          {profile.headline ||
            "Professional Candidate"}
        </p>
      </div>

      <section>
        <h3>About</h3>

        <p>
          {profile.about ||
            "Your professional summary will appear here."}
        </p>
      </section>
    </div>
  );
}