import { useLayoutEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Power } from "lucide-react";

import useIsAdmin from "../../hooks/useIsAdmin";
import useSiteStatus from "../../hooks/useSiteStatus";

const DEFAULT_MESSAGE = "WestForce is down for maintenance. Please try again soon.";

// Admins must still be able to sign in while the site is shut down.
const OPEN_PATHS = ["/auth/sign-in", "/auth/forgot-password", "/auth/reset-password"];

export function MaintenanceScreen({ message, onRetry, retrying = false }) {
  return (
    <main className="maintenance-screen">
      <div className="maintenance-card">
        <img className="maintenance-logo" src="/favicon.png" alt="WestForce" width="56" height="56" />
        <h1>We&rsquo;ll be back soon</h1>
        <p>{message || DEFAULT_MESSAGE}</p>
        {onRetry && (
          <div className="maintenance-retry" role="alert">
            <p>We could not check if you are an admin.</p>
            <button type="button" onClick={onRetry} disabled={retrying}>
              {retrying ? "Checking..." : "Try again"}
            </button>
          </div>
        )}
        <p className="maintenance-admin">
          Run the site? <Link to="/auth/sign-in">Sign in</Link>
        </p>
      </div>
    </main>
  );
}

/**
 * Runs only while maintenance is on, so Firebase stays lazy the rest of the
 * time. It never wraps the app: it tells the gate when to hide it, and the
 * app stays mounted, so forms keep what was typed when maintenance toggles.
 */
function AdminCheck({ message, onHideApp }) {
  const { isAdmin, loading, error, refresh } = useIsAdmin();
  // "pending" until the first answer. While a later check runs, keep the last
  // answer, so the app doesn't blank for someone who was already using it.
  const [view, setView] = useState("pending");
  const answer = loading ? null : isAdmin ? "admin" : error ? "error" : "blocked";
  if (answer && answer !== view) setView(answer);

  const hide = view === "blocked" || view === "error";

  // Layout effect, so the app hides in the same paint the screen shows.
  useLayoutEffect(() => {
    onHideApp(hide);
    return () => onHideApp(false);
  }, [hide, onHideApp]);

  if (view === "admin") {
    return (
      <div className="site-admin-bar" role="status">
        <Power size={14} aria-hidden="true" />
        <span>Site is shut down. Only admins can see it.</span>
        <Link to="/admin/settings">Site settings</Link>
      </div>
    );
  }

  if (hide) {
    return (
      <MaintenanceScreen
        message={message}
        onRetry={view === "error" ? refresh : undefined}
        retrying={loading}
      />
    );
  }

  return null;
}

/**
 * While maintenance is on, visitors see the "We'll be back soon" page.
 * The app below always renders in the same place; for confirmed visitors it
 * is only hidden, never unmounted.
 */
export default function MaintenanceGate({ children }) {
  const { maintenance } = useSiteStatus();
  const { pathname } = useLocation();
  const [appHidden, setAppHidden] = useState(false);

  const gated = maintenance.on && !OPEN_PATHS.includes(pathname.replace(/\/+$/, ""));

  return (
    <>
      {gated && <AdminCheck message={maintenance.message} onHideApp={setAppHidden} />}
      <div className="maintenance-app" hidden={gated && appHidden}>
        {children}
      </div>
    </>
  );
}
