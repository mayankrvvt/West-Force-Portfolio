import React, { useEffect, useState } from "react";

const menuItems = [
  { id: "home", label: "Overview" },
  { id: "about", label: "About" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "documents", label: "Documents" },
  { id: "resume", label: "Resume" },
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
      <div className="portfolio-sidebar-top">
        <img
          className="portfolio-sidebar-logo"
          src="/favicon.png"
          alt="WestForce"
          width="28"
          height="28"
        />
        {profile?.name && (
          <p className="portfolio-sidebar-name">{profile.name}</p>
        )}
      </div>

      <nav
        className="portfolio-navigation"
        aria-label="Portfolio sections"
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
              aria-current={isActive ? "location" : undefined}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      <p className="portfolio-sidebar-footer">
        Portfolio hosted by WestForce
      </p>
    </aside>
  );
}
