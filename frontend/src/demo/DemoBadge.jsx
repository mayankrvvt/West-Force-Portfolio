import { useLocation } from "react-router-dom";

/**
 * Small badge shown only in local demo mode (see demoMode.js).
 * Dashboard pages show it inline in their top bar (`inline`), so it never
 * sits over page content. Other pages get a fixed badge just left of the
 * chat launcher, clear of the sidebar's Sign out button.
 */
const style = {
  position: "fixed",
  right: "calc(var(--chat-launcher-offset, var(--space-5)) + var(--chat-launcher-size, 48px) + var(--space-3))",
  bottom: "calc(var(--chat-launcher-offset, var(--space-5)) + var(--space-3))",
  zIndex: 1200,
  padding: "var(--space-1) var(--space-2)",
  borderRadius: "var(--radius-control, 4px)",
  background: "var(--wf-navy)",
  color: "var(--wf-frost)",
  fontFamily: "var(--font-ui)",
  fontSize: "var(--text-xs)",
  lineHeight: 1.4,
  opacity: 0.9,
  pointerEvents: "none",
};

export default function DemoBadge({ inline = false }) {
  const { pathname } = useLocation();

  if (inline) {
    return <span className="demo-badge" role="note">Demo mode</span>;
  }

  // Dashboard shows it inline; public portfolios are the candidate's page
  if (pathname.startsWith("/dashboard")) return null;
  if (pathname.startsWith("/portfolio/")) return null;

  return (
    <div style={style} role="note" aria-label="Demo mode, local only">
      Demo mode, local only
    </div>
  );
}
