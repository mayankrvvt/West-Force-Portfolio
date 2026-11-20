import { useCallback, useEffect, useMemo, useState } from "react";

import { DEFAULT_SITE_STATUS, SiteStatusContext } from "../../hooks/useSiteStatus";
import { getSiteStatus } from "../../services/siteService";
import { MAINTENANCE_EVENT } from "../../utils/api";

const REFRESH_MS = 60 * 1000;

function withDefaults(status) {
  return {
    maintenance: { ...DEFAULT_SITE_STATUS.maintenance, ...status.maintenance },
    banner: { ...DEFAULT_SITE_STATUS.banner, ...status.banner },
    features: { ...DEFAULT_SITE_STATUS.features, ...status.features },
  };
}

/**
 * Loads the site status once, then about every minute while the tab is
 * visible. Any API reply of 503 MAINTENANCE also turns maintenance on.
 */
export default function SiteStatusProvider({ children }) {
  const [status, setStatus] = useState(DEFAULT_SITE_STATUS);
  // The message from a 503 MAINTENANCE reply, or null when none came.
  const [blocked, setBlocked] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const next = withDefaults(await getSiteStatus());
      setStatus(next);
      if (!next.maintenance.on) setBlocked(null);
    } catch (error) {
      // Fail open: keep showing the site as it is.
      console.warn("Could not load the site status.", error);
    }
  }, []);

  useEffect(() => {
    refresh();

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const onMaintenance = (event) => {
      setBlocked(event.detail?.message || "");
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(MAINTENANCE_EVENT, onMaintenance);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(MAINTENANCE_EVENT, onMaintenance);
    };
  }, [refresh]);

  const value = useMemo(() => {
    const maintenance = blocked !== null && !status.maintenance.on
      ? { on: true, message: blocked }
      : status.maintenance;
    return { ...status, maintenance, refresh };
  }, [status, blocked, refresh]);

  return <SiteStatusContext.Provider value={value}>{children}</SiteStatusContext.Provider>;
}
