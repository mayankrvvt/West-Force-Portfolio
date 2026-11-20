import React, { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";

/*
 * Top bar for the portfolio: logo, candidate name and section links.
 * (The file keeps its old name because other pages import it.)
 */
const menuItems = [
  { id: "about", label: "About" },
  { id: "certificates", label: "Certificates" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "education", label: "Education" },
  { id: "documents", label: "Documents" },
  { id: "resume", label: "Resume" },
];

export default function PortfolioSidebar({
  profile,
  sectionIds,
  resumeUrl = "",
}) {
  const [activeSection, setActiveSection] = useState("home");
  const sidebarRef = useRef(null);

  const items = Array.isArray(sectionIds)
    ? menuItems.filter((item) => sectionIds.includes(item.id))
    : menuItems;

  // Smooth scroll when clicking a link
  const scrollTo = (id) => {
    const section = document.getElementById(id);

    if (!section) return;

    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    section.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    const trackedIds = ["home", ...menuItems.map((item) => item.id)];

    const handleScroll = () => {
      const sections = trackedIds
        .map((id) => {
          const element = document.getElementById(id);

          if (!element) return null;

          const rect = element.getBoundingClientRect();

          return {
            id,
            top: rect.top,
            bottom: rect.bottom,
          };
        })
        .filter(Boolean);

      if (!sections.length) return;

      // In the dashboard preview the page scrolls inside .portfolio-viewer
      const viewer = sidebarRef.current?.closest(".portfolio-viewer");
      const viewerRect = viewer?.getBoundingClientRect();
      const triggerPoint = viewerRect
        ? viewerRect.top + viewerRect.height * 0.3
        : window.innerHeight * 0.3;

      const currentSection = sections.find(
        (section) =>
          section.top <= triggerPoint &&
          section.bottom > triggerPoint
      );

      if (currentSection) {
        setActiveSection(currentSection.id);
        return;
      }

      // Between sections: use the closest one
      let closestSection = sections[0];
      let closestDistance = Math.abs(sections[0].top - triggerPoint);

      sections.forEach((section) => {
        const distance = Math.abs(section.top - triggerPoint);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestSection = section;
        }
      });

      setActiveSection(closestSection.id);
    };

    handleScroll();

    // Capture so scrolls inside the preview box are seen too
    document.addEventListener("scroll", handleScroll, {
      passive: true,
      capture: true,
    });

    window.addEventListener("resize", handleScroll);

    return () => {
      document.removeEventListener("scroll", handleScroll, {
        capture: true,
      });
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <header className="portfolio-sidebar" ref={sidebarRef}>
      <div className="portfolio-sidebar-inner">
        <button
          type="button"
          className="portfolio-sidebar-brand"
          onClick={() => scrollTo("home")}
          aria-label="Back to top"
        >
          <img
            src="/favicon.png"
            alt=""
            className="portfolio-sidebar-logo"
            width="28"
            height="28"
          />
          {profile?.name && (
            <span className="portfolio-sidebar-name">{profile.name}</span>
          )}
        </button>

        <nav
          className="portfolio-navigation"
          aria-label="Portfolio sections"
        >
          {items.map((item) => {
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollTo(item.id)}
                className={`portfolio-nav-item ${isActive ? "active" : ""}`}
                aria-current={isActive ? "location" : undefined}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {resumeUrl && (
          <a
            href={resumeUrl}
            className="btn btn-primary btn-sm portfolio-sidebar-resume"
            target="_blank"
            rel="noreferrer"
          >
            <Download size={16} aria-hidden="true" />
            Resume
          </a>
        )}
      </div>
    </header>
  );
}
