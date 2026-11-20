import { useEffect, useState } from "react";
import { AlertCircle, BriefcaseBusiness, ExternalLink, RefreshCw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { APPLICATION_STATUSES, deleteApplication, getApplications, updateApplicationStatus } from "../../services/applicationService";

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try { setApplications(await getApplications()); }
    catch (err) { setError(err.message || "Could not load applications."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const changeStatus = async (id, status) => {
    setError("");
    try {
      const updated = await updateApplicationStatus(id, status);
      setApplications((items) => items.map((item) => item._id === id ? updated : item));
    } catch (err) { setError(err.message || "Could not update the status."); }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this application?")) return;
    setError("");
    try {
      await deleteApplication(id);
      setApplications((items) => items.filter((item) => item._id !== id));
    } catch (err) { setError(err.message || "Could not remove the application."); }
  };

  return <div className="dashboard-product">
    <header className="product-page-header"><div><h1>Applications</h1><p>Track the jobs you saved and move each one along as you hear back.</p></div><button className="product-button" onClick={load} disabled={loading}><RefreshCw size={16} aria-hidden="true"/> Refresh</button></header>
    {error && <div className="product-notice" role="alert"><AlertCircle size={16} aria-hidden="true"/><span>{error}</span></div>}
    {loading ? <div className="empty-product">Loading applications…</div>
      : !applications.length && !error ? <section className="product-card"><div className="empty-product"><BriefcaseBusiness size={28} aria-hidden="true"/><h2>No applications yet</h2><p>Find a job you like and save it. It will show up here so you can track it.</p><Link className="product-button primary" to="/dashboard/jobs">Find jobs</Link></div></section>
      : <section className="product-card"><div className="application-board">{APPLICATION_STATUSES.map((column) => <div className="application-column" key={column}><div className="application-column-header"><strong>{column}</strong><span>{applications.filter((item) => item.status === column).length}</span></div>{applications.filter((item) => item.status === column).map((application) => <div className="application-card" key={application._id}><strong>{application.role}</strong><span>{application.company}</span>{application.location && <small>{application.location}</small>}<select className="application-status-select" value={application.status} onChange={(e) => changeStatus(application._id, e.target.value)} aria-label="Status">{APPLICATION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>{application.appliedAt && <small>Applied {new Date(application.appliedAt).toLocaleDateString()}</small>}<div className="application-card-actions">{application.url && <a className="product-link" href={application.url} target="_blank" rel="noopener noreferrer">Job details <ExternalLink size={12} aria-hidden="true"/></a>}<button type="button" className="btn btn-danger btn-sm application-remove" title="Remove" aria-label={`Remove application for ${application.role}`} onClick={() => remove(application._id)}><Trash2 size={14} aria-hidden="true"/></button></div></div>)}</div>)}</div></section>}
  </div>;
}
