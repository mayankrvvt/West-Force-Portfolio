import React from "react";

export default function PortfolioHero({ data, profile }) {
  return (
    <section id="home" className="portfolio-hero">
      <div className="hero-grid" aria-hidden="true"></div>
      <div className="hero-glow hero-glow-one" aria-hidden="true"></div>
      <div className="hero-glow hero-glow-two" aria-hidden="true"></div>

      <div className="portfolio-hero-content">
        <div className="hero-kicker">
          <span className="kicker-line"></span>
          {data.greeting}
        </div>

        <h1>
          {data.name}
          <span className="hero-dot">.</span>
        </h1>

        <h2>{data.headline}</h2>

        <p className="hero-description">{data.description}</p>

        <div className="hero-contact">
          <span><i>⌖</i>{profile.location}</span>
          <span><i>✉</i>{profile.email}</span>
        </div>

        <div className="hero-buttons">
          <a href="#resume" className="primary-button">
            View Resume <span>↗</span>
          </a>
          <a href="#documents" className="secondary-button">
            View Documents <span>↓</span>
          </a>
        </div>
      </div>

      <div className="hero-visual" aria-hidden="true">
        <div className="hero-orbit orbit-one"></div>
        <div className="hero-orbit orbit-two"></div>
        <div className="hero-profile-card">
          <div className="hero-avatar">
            {profile?.image ? (
              <img src={profile.image} alt="" />
            ) : (
              profile?.name?.charAt(0)
            )}
          </div>
          <div className="hero-card-status">
            <span></span>
            Open to opportunities
          </div>
          <strong>{profile?.name}</strong>
          <small>{profile?.location}</small>
        </div>
        <div className="hero-floating-label label-top">8+ Years Experience</div>
        <div className="hero-floating-label label-bottom">Project · Leadership · Delivery</div>
      </div>
    </section>
  );
}
