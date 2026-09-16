import React, { useEffect, useState } from "react";

const menuItems = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "about", label: "About Me", icon: "◉" },
  { id: "education", label: "Education Details", icon: "🎓" },
  { id: "documents", label: "My Documents", icon: "▣" },
  { id: "skills", label: "My Skills", icon: "◆" },
  { id: "experience", label: "Professional Details", icon: "▤" },
  { id: "resume", label: "Resume", icon: "▤" },
];

export default function PortfolioSidebar({ profile }) {
  const [activeSection, setActiveSection] = useState("home");

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    const sections = menuItems
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) setActiveSection(visible.target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.3, 0.6] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <aside className="portfolio-sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">W</span>
        <span>WestForce</span>
      </div>

      <div className="sidebar-profile">
        <div className="profile-image-wrapper">
          <span className="profile-ring" aria-hidden="true" />
          {profile?.image ? (
            <img src={profile.image} alt={profile.name} />
          ) : (
            <div className="profile-placeholder">
              {profile?.name?.charAt(0)}
            </div>
          )}
        </div>

        <h2>{profile?.name}</h2>
        <p>{profile?.title}</p>

        {profile?.available && (
          <div className="availability">
            <span></span>
            Available for opportunities
          </div>
        )}
      </div>

      <nav className="portfolio-navigation" aria-label="Portfolio navigation">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => scrollTo(item.id)}
            className={`portfolio-nav-item ${activeSection === item.id ? "active" : ""}`}
            aria-current={activeSection === item.id ? "page" : undefined}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
            <span className="nav-arrow">→</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <p>Professional portfolio</p>
        <strong>WestForce</strong>
      </div>
    </aside>
  );
}
