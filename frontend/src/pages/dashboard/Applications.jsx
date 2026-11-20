import { useEffect, useRef, useState } from "react";
import { AlertCircle, BriefcaseBusiness, CalendarDays, Clock, ExternalLink, FilePenLine, MapPin, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { APPLICATION_STATUSES, deleteApplication, getApplications, updateApplicationStatus } from "../../services/applicationService";
import { formatDate } from "../../utils/formatDate";
import PageSkeleton from "../../components/dashboard/Skeleton";

const UNDO_MS = 5000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Numbers for the strip above the board.
function summarize(applications) {
  const counts = APPLICATION_STATUSES.map((status) => ({ status, count: applications.filter((item) => item.status === status).length }));
  const countOf = (status) => counts.find((entry) => entry.status === status).count;
  const sent = applications.length - countOf("Saved");
  const weekAgo = Date.now() - WEEK_MS;
  const appliedThisWeek = applications.filter((item) => item.status !== "Saved" && item.appliedAt && new Date(item.appliedAt).getTime() >= weekAgo).length;
  const interviewRate = sent ? Math.round(((countOf("Interview") + countOf("Offer")) / sent) * 100) : null;
  return { counts, appliedThisWeek, interviewRate };
}

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // The application waiting to be removed. It is only deleted on the
  // server once the undo toast runs out (or another one is removed).
  const [pending, setPending] = useState(null);
  const pendingRef = useRef(null);
  // Ids removed on this page. They stay hidden from refreshes until the
  // DELETE fails or the removal is undone, so an in-flight load can't bring them back.
  const hiddenIds = useRef(new Set());
  const mountedRef = useRef(false);

  const commitDelete = (entry, options) => {
    if (entry.committed) return;
    entry.committed = true;
    clearTimeout(entry.timer);
    if (pendingRef.current === entry) {
      pendingRef.current = null;
      if (mountedRef.current) setPending(null);
    }
    const id = entry.application._id;
    // Fire and forget: the page may be closing.
    deleteApplication(id, options).catch((err) => {
      hiddenIds.current.delete(id);
      if (!mountedRef.current) return;
      setApplications((items) => restore(items, entry));
      setError(err.message || "Could not remove the application.");
    });
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const items = await getApplications();
      if (!mountedRef.current) return;
      setApplications(items.filter((item) => !hiddenIds.current.has(item._id)));
    } catch (err) {
      if (mountedRef.current) setError(err.message || "Could not load applications.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    load();
    // Closing or reloading the tab finishes a removal that is still waiting.
    const onPageHide = () => { if (pendingRef.current) commitDelete(pendingRef.current, { keepalive: true }); };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      mountedRef.current = false;
      // Leaving the page finishes it too.
      if (pendingRef.current) commitDelete(pendingRef.current);
    };
  }, []);

  const changeStatus = async (id, status) => {
    setError("");
    try {
      const updated = await updateApplicationStatus(id, status);
      setApplications((items) => items.map((item) => item._id === id ? updated : item));
    } catch (err) { setError(err.message || "Could not update the status."); }
  };

  const remove = (application) => {
    setError("");
    if (pendingRef.current) commitDelete(pendingRef.current);
    const index = applications.findIndex((item) => item._id === application._id);
    const entry = { application, index };
    entry.timer = setTimeout(() => commitDelete(entry), UNDO_MS);
    hiddenIds.current.add(application._id);
    pendingRef.current = entry;
    setPending(entry);
    setApplications((items) => items.filter((item) => item._id !== application._id));
  };

  const undo = () => {
    const entry = pendingRef.current;
    if (!entry) return;
    clearTimeout(entry.timer);
    hiddenIds.current.delete(entry.application._id);
    pendingRef.current = null;
    setPending(null);
    setApplications((items) => restore(items, entry));
  };

  const total = applications.length;
  const summary = summarize(applications);
  const pipelineLabel = summary.counts.map(({ status, count }) => `${status} ${count}`).join(", ");

  return <div className="dashboard-product">
    <header className="product-page-header">
      <div><h1>Applications</h1><p>Track the jobs you saved and move each one along as you hear back.</p></div>
      <div className="product-actions">
        <button className="product-button" onClick={load} disabled={loading}><RefreshCw size={16} aria-hidden="true"/> Refresh</button>
        <Link className="product-button primary" to="/dashboard/jobs"><Plus size={16} aria-hidden="true"/> Find jobs</Link>
      </div>
    </header>
    {error && <div className="product-error" role="alert"><AlertCircle size={16} aria-hidden="true"/><span>{error}</span></div>}
    {loading ? <PageSkeleton layout="board" label="Loading applications" />
      : !total && !pending && !error ? <div className="empty-product"><span className="empty-product-icon"><BriefcaseBusiness size={22} aria-hidden="true"/></span><h2>No applications yet</h2><p>Find a job you like and save it. It will show up here so you can track it.</p><Link className="product-button primary" to="/dashboard/jobs">Find jobs</Link></div>
      : <>
      <section className="application-summary" aria-label="Summary">
        <dl className="application-summary-stats">
          <div><dt>Tracked</dt><dd>{total}</dd></div>
          <div><dt>Applied this week</dt><dd>{summary.appliedThisWeek}</dd></div>
          <div><dt>Interview rate</dt><dd>{summary.interviewRate === null ? "None yet" : `${summary.interviewRate}%`}</dd></div>
        </dl>
        <div className="application-pipeline">
          <div className="application-pipeline-bar" role="img" aria-label={`Applications by status: ${pipelineLabel}`}>
            {summary.counts.filter(({ count }) => count).map(({ status, count }) => <span className={`application-pipeline-segment column-${status.toLowerCase()}`} style={{ flexGrow: count }} title={`${status}: ${count}`} key={status} />)}
          </div>
          <ul className="application-pipeline-legend" aria-hidden="true">
            {summary.counts.map(({ status, count }) => <li className={`column-${status.toLowerCase()}`} key={status}><span className="application-column-dot" />{status} <strong>{count}</strong></li>)}
          </ul>
        </div>
      </section>
      <div className="application-board-scroll" tabIndex={0} aria-label="Applications by status">
        <div className="application-board">{APPLICATION_STATUSES.map((column) => {
          const items = applications.filter((item) => item.status === column);
          const key = column.toLowerCase();
          return <section className={`application-column column-${key}`} key={column} aria-label={`${column}, ${items.length}`}>
            <div className="application-column-header">
              <span className="application-column-dot" aria-hidden="true" />
              <strong>{column}</strong>
              <span className="application-count">{items.length}</span>
            </div>
            {items.length ? items.map((application) => <article className="application-card" key={application._id}>
              <div className="application-card-top">
                <span className="application-card-avatar" aria-hidden="true">{(application.company || application.role || "?").trim().charAt(0)}</span>
                <div className="application-card-head">
                  <strong>{application.role}</strong>
                  <span>{application.company}</span>
                </div>
              </div>
              {(application.location || application.appliedAt || application.updatedAt) && <div className="application-card-meta">
                {application.location && <span><MapPin size={12} aria-hidden="true"/>{application.location}</span>}
                {application.appliedAt && column !== "Saved" && <span><CalendarDays size={12} aria-hidden="true"/>Applied {formatDate(application.appliedAt)}</span>}
                {application.updatedAt && <span className="application-card-updated"><Clock size={12} aria-hidden="true"/>Updated {formatDate(application.updatedAt)}</span>}
              </div>}
              <div className="application-card-actions">
                <select className="application-status-select" value={application.status} onChange={(e) => changeStatus(application._id, e.target.value)} aria-label={`Status for ${application.role}`}>{APPLICATION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
                <Link className="icon-button" to={`/dashboard/tailor-resume?applicationId=${encodeURIComponent(application._id)}`} title="Tailor resume" aria-label={`Tailor your resume to ${application.role}`}><FilePenLine size={15} aria-hidden="true"/></Link>
                {application.url && <a className="icon-button" href={application.url} target="_blank" rel="noopener noreferrer" title="Open job details" aria-label={`Open job details for ${application.role}`}><ExternalLink size={15} aria-hidden="true"/></a>}
                <button type="button" className="icon-button danger" title="Remove" aria-label={`Remove application for ${application.role}`} onClick={() => remove(application)}><Trash2 size={15} aria-hidden="true"/></button>
              </div>
            </article>) : <p className="application-empty">Nothing here yet</p>}
          </section>;
        })}</div>
      </div>
      </>}
    <div className="product-toast-region" aria-live="polite">
      {pending && <div className="product-toast">
        <span>Removed {pending.application.role}</span>
        <button type="button" onClick={undo}>Undo</button>
      </div>}
    </div>
  </div>;
}

function restore(items, entry) {
  if (items.some((item) => item._id === entry.application._id)) return items;
  const next = [...items];
  next.splice(Math.min(entry.index, next.length), 0, entry.application);
  return next;
}
