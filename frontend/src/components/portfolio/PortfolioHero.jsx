import React from "react";
import { Mail, MapPin } from "lucide-react";

export default function PortfolioHero({ data, profile }) {
  return (
    <header id="home" className="portfolio-hero">
      {profile?.image && (
        <img
          className="portfolio-hero-photo"
          src={profile.image}
          alt={profile?.name ? `Photo of ${profile.name}` : "Profile photo"}
        />
      )}

      <div className="portfolio-hero-content">
        <h1>{data.name}</h1>

        {data.headline && <p className="portfolio-role">{data.headline}</p>}

        {(profile?.location || profile?.email) && (
          <ul className="portfolio-contact">
            {profile?.location && (
              <li>
                <MapPin size={16} aria-hidden="true" />
                {profile.location}
              </li>
            )}
            {profile?.email && (
              <li>
                <Mail size={16} aria-hidden="true" />
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
              </li>
            )}
          </ul>
        )}

        {profile?.available && (
          <p className="portfolio-availability">Open to opportunities</p>
        )}

        {data.description && (
          <p className="portfolio-summary wf-read">{data.description}</p>
        )}

        <div className="portfolio-hero-actions">
          <a href="#resume" className="btn btn-primary">
            View resume
          </a>
          <a href="#documents" className="btn btn-secondary">
            View documents
          </a>
        </div>
      </div>
    </header>
  );
}
