import React from "react";
import { Download, Mail, MapPin, Phone, Play } from "lucide-react";

import MapleLeaf from "../brand/MapleLeaf";

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function firstName(name = "") {
  return name.trim().split(/\s+/)[0] || "";
}

export default function PortfolioHero({
  data,
  profile,
  facts = [],
  resumeUrl = "",
  onWatchIntro = null,
}) {
  const name = data?.name || profile?.name || "";
  const role = profile?.title || data?.headline || "";
  const phoneHref = profile?.phone
    ? `tel:${profile.phone.replace(/[^\d+]/g, "")}`
    : "";
  const initials = getInitials(name);

  return (
    <section id="home" className="portfolio-hero" aria-label="Candidate">
      <MapleLeaf className="portfolio-hero-leaf" />

      <div className="portfolio-hero-inner">
        <div className="portfolio-hero-identity">
          {profile?.image ? (
            <img
              className="portfolio-hero-photo"
              src={profile.image}
              width="128"
              height="128"
              alt={name ? `Photo of ${name}` : "Profile photo"}
            />
          ) : (
            initials && (
              <span className="portfolio-monogram" aria-hidden="true">
                {initials}
              </span>
            )
          )}

          <div className="portfolio-hero-content">
            {profile?.available && (
              <p className="portfolio-availability">
                <span className="portfolio-availability-dot" aria-hidden="true" />
                Open to work
              </p>
            )}

            <h1>{name}</h1>

            {role && <p className="portfolio-role">{role}</p>}

            {profile?.location && (
              <p className="portfolio-location">
                <MapPin size={16} aria-hidden="true" />
                {profile.location}
              </p>
            )}
          </div>
        </div>

        {data?.description && (
          <p className="portfolio-summary">{data.description}</p>
        )}

        {(profile?.email || phoneHref || resumeUrl || onWatchIntro) && (
          <div className="portfolio-hero-actions">
            {profile?.email && (
              <a
                href={`mailto:${profile.email}`}
                className="btn portfolio-action portfolio-action-primary"
              >
                <Mail size={18} aria-hidden="true" />
                Email {firstName(name) || "candidate"}
              </a>
            )}

            {phoneHref && (
              <a href={phoneHref} className="btn portfolio-action">
                <Phone size={18} aria-hidden="true" />
                Call
                <span className="portfolio-action-detail">{profile.phone}</span>
              </a>
            )}

            {onWatchIntro && (
              <button
                type="button"
                className="btn portfolio-action"
                onClick={onWatchIntro}
              >
                <Play size={18} aria-hidden="true" />
                Watch intro
              </button>
            )}

            {resumeUrl && (
              <a
                href={resumeUrl}
                className="btn portfolio-action"
                target="_blank"
                rel="noreferrer"
              >
                <Download size={18} aria-hidden="true" />
                Download resume
              </a>
            )}
          </div>
        )}

        {/* Plain contact text, shown only on paper */}
        {(profile?.email || profile?.phone) && (
          <p className="portfolio-print-contact">
            {[profile?.email, profile?.phone].filter(Boolean).join("   ")}
          </p>
        )}
      </div>

      {facts.length > 0 && (
        <dl className="portfolio-facts">
          {facts.map((fact) => (
            <div className="portfolio-fact" key={fact.label}>
              <dt>{fact.label}</dt>
              <dd>
                {fact.value}
                {fact.note && (
                  <span className="portfolio-fact-note">{fact.note}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
