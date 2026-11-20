import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BarChart3,
  Check,
  FileText,
  Lock,
  LockOpen,
  Play,
} from "lucide-react";

import MapleLeaf from "../brand/MapleLeaf";

// Sample content for the product preview (the demo user, Emma Tremblay).
const skills = ["Personal care", "Dementia care", "Mobility support", "First aid and CPR"];

const documents = [
  { name: "Resume", detail: "PDF, 2 pages", Icon: FileText },
  { name: "Certificates", detail: "3 files", Icon: Award },
  { name: "Skills report", detail: "TestGorilla", Icon: BarChart3 },
];

const assurances = [
  "One payment, no monthly fee",
  "Documents locked behind your PIN",
  "Coaching on every plan",
];

/*
 * Load sequence (CSS only, public.css "Hero entrance"): the headline lines
 * rise, the lede, buttons and assurances follow, then the preview settles
 * onto its navy stage and the "PIN accepted" note slides in. Reduced motion
 * gets the final state at once.
 */
export default function Hero() {
  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <MapleLeaf className="home-hero-leaf" />

      <div className="container home-hero-inner">
        <div className="home-hero-copy">
          <p className="home-kicker home-hero-kicker">
            Professional portfolios for job seekers in Canada
          </p>

          <h1 id="home-hero-title">
            <span className="home-hero-line">Let employers meet you</span>{" "}
            <span className="home-hero-line">before the interview.</span>
          </h1>

          <p className="home-hero-lede">
            Put your resume, a short intro video, certificates and work
            history on one page. Send one link, and only employers with
            your PIN can open your documents.
          </p>

          <div className="home-hero-actions">
            <Link to="/auth/sign-up" className="btn btn-primary btn-lg">
              Build your portfolio
            </Link>

            <Link to="/how-it-works" className="home-text-link">
              See how it works
              <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>

          <ul className="home-hero-assure">
            {assurances.map((item) => (
              <li key={item}>
                <Check size={16} strokeWidth={2.25} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="home-hero-visual">
          <div className="home-hero-stage" aria-hidden="true" />

          <figure className="hero-preview" aria-label="Sample portfolio for Emma Tremblay, as an employer sees it">
            <div className="hero-preview-bar">
              <span className="hero-preview-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>

              <span className="hero-preview-url">
                <Lock size={12} strokeWidth={2.25} aria-hidden="true" />
                <span className="hero-preview-host">west-force-portfolio.vercel.app/portfolio/</span>
                <strong>emma-tremblay</strong>
              </span>
            </div>

            <div className="hero-preview-body">
              <div className="hero-preview-person">
                <span className="hero-preview-avatar" aria-hidden="true">ET</span>

                <span className="hero-preview-who">
                  <span className="hero-preview-name">Emma Tremblay</span>
                  <span className="hero-preview-role">Personal support worker, Brampton, ON</span>
                </span>

                <span className="hero-preview-status">Open to work</span>
              </div>

              <div className="hero-preview-video">
                <span className="hero-preview-play" aria-hidden="true">
                  <Play size={18} strokeWidth={2} />
                </span>

                <span className="hero-preview-video-text">
                  <span className="hero-preview-video-title">Intro video</span>
                  <span className="hero-preview-video-meta">Hi, I am Emma. I have four years of home care experience.</span>
                </span>

                <span className="hero-preview-video-time">1:24</span>
              </div>

              <ul className="hero-preview-skills" aria-label="Skills">
                {skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>

              <ul className="hero-preview-docs" aria-label="Documents">
                {documents.map((doc, index) => {
                  const Icon = doc.Icon;
                  return (
                    <li key={doc.name} style={{ "--row": index }}>
                      <span className="hero-preview-doc-icon" aria-hidden="true">
                        <Icon size={16} strokeWidth={2} />
                      </span>
                      <span className="hero-preview-doc-name">{doc.name}</span>
                      <span className="hero-preview-doc-detail">{doc.detail}</span>
                      <Lock className="hero-preview-doc-lock" size={14} strokeWidth={2.25} aria-hidden="true" />
                    </li>
                  );
                })}
              </ul>
            </div>

            <figcaption className="hero-preview-foot">
              <span className="wf-seal">
                <MapleLeaf width="14" height="14" />
                PIN protected documents
              </span>
            </figcaption>
          </figure>

          <p className="hero-preview-note" aria-hidden="true">
            <span className="hero-preview-note-icon">
              <LockOpen size={16} strokeWidth={2} />
            </span>
            <span>
              <strong>PIN accepted</strong>
              <span>Hiring manager opened the resume</span>
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
