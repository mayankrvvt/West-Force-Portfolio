import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Mail, Phone } from "lucide-react";

/*
 * Phone only contact bar (CSS shows it at 640px and below). It slides in
 * once the hero has scrolled out of view, so Call, Email and Resume stay
 * one tap away. Rendered on body: the portfolio wrapper is a size container,
 * which would pin a fixed bar to the page instead of the screen.
 */
export default function PortfolioContactBar({
  name = "",
  email = "",
  phone = "",
  resumeUrl = "",
}) {
  // Old browsers without IntersectionObserver just keep the bar showing
  const [visible, setVisible] = useState(
    () => !("IntersectionObserver" in window)
  );

  const phoneHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : "";
  const hasActions = Boolean(phoneHref || email || resumeUrl);

  useEffect(() => {
    const hero = document.getElementById("home");

    if (!hasActions || !hero || !("IntersectionObserver" in window)) {
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      // Show only once the hero is above the screen, not before it loads
      setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });

    observer.observe(hero);

    return () => observer.disconnect();
  }, [hasActions]);

  if (!hasActions) return null;

  const firstName = name.trim().split(/\s+/)[0] || "";

  return createPortal(
    <div
      className={`portfolio-contact-bar ${visible ? "is-visible" : ""}`}
      role="region"
      aria-label={firstName ? `Contact ${firstName}` : "Contact"}
      aria-hidden={visible ? undefined : "true"}
      inert={!visible}
    >
      {phoneHref && (
        <a href={phoneHref} className="portfolio-contact-bar-action">
          <Phone size={18} aria-hidden="true" />
          Call
        </a>
      )}

      {email && (
        <a href={`mailto:${email}`} className="portfolio-contact-bar-action">
          <Mail size={18} aria-hidden="true" />
          Email
        </a>
      )}

      {resumeUrl && (
        <a
          href={resumeUrl}
          className="portfolio-contact-bar-action"
          target="_blank"
          rel="noreferrer"
        >
          <Download size={18} aria-hidden="true" />
          Resume
        </a>
      )}
    </div>,
    document.body
  );
}
