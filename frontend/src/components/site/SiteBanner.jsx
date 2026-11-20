import { useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle, Info, X } from "lucide-react";

import useSiteStatus from "../../hooks/useSiteStatus";

const DISMISSED_KEY = "westforce_banner_dismissed";

function readDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * Slim notice at the top of public and dashboard pages. Closing it hides
 * this text only; a new text shows again. Not shown on public portfolios.
 */
export default function SiteBanner() {
  const { banner } = useSiteStatus();
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(readDismissed);

  const text = String(banner.text || "").trim();
  if (!banner.on || !text || dismissed === text || pathname.startsWith("/portfolio/")) return null;

  const warning = banner.tone === "warning";
  const Icon = warning ? AlertTriangle : Info;

  const dismiss = () => {
    setDismissed(text);
    try {
      localStorage.setItem(DISMISSED_KEY, text);
    } catch {
      /* storage blocked: hidden for this visit only */
    }
  };

  return (
    <div className={`site-banner site-banner-${warning ? "warning" : "info"}`} role="region" aria-label="Site notice">
      <Icon size={16} aria-hidden="true" />
      <p>{text}</p>
      <button type="button" onClick={dismiss} aria-label="Close notice">
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
