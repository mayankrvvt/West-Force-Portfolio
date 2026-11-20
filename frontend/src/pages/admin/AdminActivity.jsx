import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, AlertCircle, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

import { listActivity } from "../../services/adminService";
import { formatDate } from "../../utils/formatDate";
import PageSkeleton from "../../components/dashboard/Skeleton";
import usePageTitle from "../../hooks/usePageTitle";

const PAGE_SIZE = 50;

const ACTIONS = {
  "job.create": "Added job",
  "job.update": "Changed job",
  "job.delete": "Removed job",
  "admin.add": "Added admin",
  "admin.remove": "Removed admin",
  "settings.update": "Changed site settings",
};

// Plain names for the dotted settings keys, e.g. "features.ai".
const SETTING_NAMES = {
  "maintenance.on": "shut down",
  "maintenance.message": "shut down message",
  "banner.on": "banner",
  "banner.text": "banner text",
  "banner.tone": "banner tone",
  "features.signups": "sign ups",
  "features.payments": "payments",
  "features.ai": "AI tools",
  "features.jobs": "job search",
};

function describeSetting(key, value) {
  const name = SETTING_NAMES[key] || key;
  if (typeof value === "boolean") {
    if (key === "maintenance.on") return value ? "site shut down" : "site back on";
    return `${name} ${value ? "on" : "off"}`;
  }
  return `${name} changed`;
}

/** What the change was about, in plain words. */
function targetText(item) {
  const details = item.details || {};
  if (item.action === "settings.update") {
    const changes = Object.entries(details.changes || {});
    return changes.length ? changes.map(([key, value]) => describeSetting(key, value)).join(", ") : "Site";
  }
  if (item.action.startsWith("job.")) {
    const name = [details.title, details.company].filter(Boolean).join(" at ");
    if (item.action === "job.update" && Array.isArray(details.fields) && details.fields.length) {
      return `${name || "A job"} (${details.fields.join(", ")})`;
    }
    return name || "A job";
  }
  return item.target || "";
}

export default function AdminActivity() {
  usePageTitle("Activity");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const latestRef = useRef(0);

  const load = useCallback(async (target) => {
    const request = ++latestRef.current;
    setLoading(true);
    setLoadError("");
    try {
      const result = await listActivity(target);
      if (request !== latestRef.current) return;
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      if (request === latestRef.current) setLoadError(err.message || "Could not load the activity.");
    } finally {
      if (request === latestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
    return () => { latestRef.current += 1; };
  }, [load, page]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return <div className="dashboard-product">
    <header className="product-page-header">
      <div><h1>Activity</h1><p>Every change made by an admin, newest first. Kept for a year.</p></div>
      <div className="product-actions">
        <button type="button" className="product-button" onClick={() => load(page)} disabled={loading}><RefreshCw size={16} aria-hidden="true" /> Refresh</button>
      </div>
    </header>

    <section className="product-card admin-activity-card" aria-label="Activity">
      {loading ? <PageSkeleton layout="list" label="Loading activity" />
        : loadError ? <div className="empty-product" role="alert">
          <span className="empty-product-icon"><AlertCircle size={22} aria-hidden="true" /></span>
          <h2>Could not load the activity</h2>
          <p>{loadError}</p>
          <button type="button" className="product-button primary" onClick={() => load(page)}>Try again</button>
        </div>
        : !items.length ? <div className="empty-product">
          <span className="empty-product-icon"><Activity size={22} aria-hidden="true" /></span>
          <h2>Nothing here yet</h2>
          <p>When an admin changes a job, an admin or the site settings, it shows up here.</p>
        </div>
        : <ul className="admin-activity-list">
          {items.map((item, index) => (
            <li className="admin-activity-row" key={item._id || `${item.at}-${index}`}>
              <span className="admin-activity-who">{item.actorEmail || "Unknown"}</span>
              <strong className="admin-activity-action">{ACTIONS[item.action] || item.action}</strong>
              <span className="admin-activity-target">{targetText(item)}</span>
              <time className="admin-activity-date" dateTime={item.at}>{formatDate(item.at)}</time>
            </li>
          ))}
        </ul>}
    </section>

    {!loadError && total > PAGE_SIZE && <nav className="job-pagination" aria-label="Activity pages">
      <button type="button" className="product-button compact" onClick={() => setPage((p) => p - 1)} disabled={loading || page <= 1}>
        <ChevronLeft size={16} aria-hidden="true" /> Newer
      </button>
      <span>Page {page} of {pages}</span>
      <button type="button" className="product-button compact" onClick={() => setPage((p) => p + 1)} disabled={loading || page >= pages}>
        Older <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>}
  </div>;
}
