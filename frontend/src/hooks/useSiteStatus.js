import { createContext, useContext } from "react";

/**
 * Public site status from GET /api/site/status: maintenance, banner and
 * feature switches. Everything is on and open until the server says
 * otherwise, so a failed fetch leaves the site working (fail open).
 * The server is still the real guard; this only hides the entry points.
 */
export const DEFAULT_SITE_STATUS = {
  maintenance: { on: false, message: "" },
  banner: { on: false, text: "", tone: "info" },
  features: { signups: true, payments: true, ai: true, jobs: true },
};

export const SiteStatusContext = createContext({
  ...DEFAULT_SITE_STATUS,
  refresh: () => {},
});

/** { maintenance, banner, features, refresh } */
export default function useSiteStatus() {
  return useContext(SiteStatusContext);
}

/** True unless an admin has switched this feature off. */
export function useFeature(name) {
  return useContext(SiteStatusContext).features[name] !== false;
}

/** What a paused entry point says instead of its usual label. */
export const PAUSED_TEXT = {
  signups: "New sign ups are paused",
  payments: "Payments are paused",
  ai: "AI tools are paused",
  jobs: "Job search is paused",
};
