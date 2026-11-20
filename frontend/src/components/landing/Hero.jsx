import { Link } from "react-router-dom";

const portfolioSections = [
  { name: "Resume", detail: "PDF, 2 pages" },
  { name: "Intro video", detail: "1 min 24 s" },
  { name: "Skills", detail: "12 listed" },
  { name: "Certificates", detail: "3 files" },
  { name: "Experience", detail: "4 roles" },
];

function MapleLeaf() {
  return (
    <img
      src="/maple-leaf.png"
      alt=""
      width="14"
      height="14"
      className="link-panel-leaf"
    />
  );
}

export default function Hero() {
  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="container home-hero-inner">
        <div className="home-hero-copy">
          <h1 id="home-hero-title">
            Your career deserves more than a resume.
          </h1>

          <p className="home-hero-lede">
            Build a professional portfolio that brings your
            resume, video, skills, certificates and experience
            together in one secure link, ready to share with
            Canadian employers.
          </p>

          <div className="home-hero-actions">
            <Link to="/auth/sign-up" className="btn btn-primary btn-lg">
              Build your portfolio
            </Link>

            <Link to="/how-it-works" className="btn btn-secondary btn-lg">
              See how it works
            </Link>
          </div>
        </div>

        <figure className="link-panel" aria-label="Example portfolio link">
          <div className="link-panel-address">
            <span className="link-panel-scheme">https://</span>
            <span>west-force-portfolio.vercel.app/portfolio/</span>
            <strong>priya-sharma</strong>
          </div>

          <ul className="link-panel-sections">
            {portfolioSections.map((section, index) => (
              <li
                key={section.name}
                style={{ "--row": index }}
              >
                <span className="link-panel-check" aria-hidden="true" />
                <span className="link-panel-name">{section.name}</span>
                <span className="link-panel-detail">{section.detail}</span>
              </li>
            ))}
          </ul>

          <figcaption className="link-panel-foot">
            <span className="wf-seal">
              <MapleLeaf />
              PIN protected documents
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
