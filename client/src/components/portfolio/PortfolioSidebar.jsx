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

  // Smooth scroll when clicking a sidebar item
  const scrollTo = (id) => {
    const section = document.getElementById(id);

    if (!section) return;

    section.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = menuItems
        .map((item) => {
          const element = document.getElementById(item.id);

          if (!element) return null;

          const rect = element.getBoundingClientRect();

          return {
            id: item.id,
            top: rect.top,
            bottom: rect.bottom,
            height: rect.height,
          };
        })
        .filter(Boolean);

      if (!sections.length) return;

      /*
       * The point on the screen used to determine
       * which section is currently active.
       *
       * 30% from the top gives a natural scrolling effect.
       */
      const triggerPoint = window.innerHeight * 0.3;

      /*
       * First check whether the trigger point is actually
       * inside one of the sections.
       */
      const currentSection = sections.find(
        (section) =>
          section.top <= triggerPoint &&
          section.bottom > triggerPoint
      );

      if (currentSection) {
        setActiveSection(currentSection.id);
        return;
      }

      /*
       * If we're between sections, find the section
       * closest to the trigger point.
       */
      let closestSection = sections[0];
      let closestDistance = Math.abs(
        sections[0].top - triggerPoint
      );

      sections.forEach((section) => {
        const distance = Math.abs(
          section.top - triggerPoint
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          closestSection = section;
        }
      });

      setActiveSection(closestSection.id);
    };

    // Run once when the component loads
    handleScroll();

    // Update while scrolling
    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    // Update if browser size changes
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <aside className="portfolio-sidebar">
      {/* BRAND */}
      <div className="sidebar-brand">
        <span className="brand-mark">W</span>
        <span>WestForce</span>
      </div>

      {/* PROFILE */}
      <div className="sidebar-profile">
        <div className="profile-image-wrapper">
          <span
            className="profile-ring"
            aria-hidden="true"
          />

          {profile?.image ? (
            <img
              src={profile.image}
              alt={profile?.name || "Profile"}
            />
          ) : (
            <div className="profile-placeholder">
              {profile?.name?.charAt(0) || "M"}
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

      {/* NAVIGATION */}
      <nav
        className="portfolio-navigation"
        aria-label="Portfolio navigation"
      >
        {menuItems.map((item) => {
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollTo(item.id)}
              className={`portfolio-nav-item ${
                isActive ? "active" : ""
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="nav-icon">
                {item.icon}
              </span>

              <span>{item.label}</span>

              <span className="nav-arrow">
                →
              </span>
            </button>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div className="sidebar-footer">
        <p>Professional portfolio</p>
        <strong>WestForce</strong>
      </div>
    </aside>
  );
}