import { useEffect, useState } from "react";
import { AlertCircle, Bookmark, ExternalLink, MapPin, Search } from "lucide-react";
import { formatSalary, isJobsNotConfigured, searchJobs } from "../../services/jobService";
import { saveJobApplication } from "../../services/applicationService";

const PAGE_SIZE = 20;

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);
  const [saved, setSaved] = useState({});
  const [saving, setSaving] = useState({});

  const loadJobs = async (nextPage = 1) => {
    setLoading(true);
    setError("");
    try {
      const result = await searchJobs({ query, location, page: nextPage, limit: PAGE_SIZE });
      setJobs(result.jobs || []);
      setTotal(result.total || 0);
      setPage(nextPage);
      setNotConfigured(false);
    } catch (err) {
      setJobs([]);
      if (isJobsNotConfigured(err)) setNotConfigured(true);
      else setError(err.message || "Could not load jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadJobs(1); }, []);

  const saveJob = async (job) => {
    setSaving((current) => ({ ...current, [job._id]: true }));
    try {
      await saveJobApplication(job);
      setSaved((current) => ({ ...current, [job._id]: true }));
    } catch (err) {
      setError(err.message || "Could not save the job. Please try again.");
    } finally {
      setSaving((current) => ({ ...current, [job._id]: false }));
    }
  };

  const onSubmit = (event) => { event.preventDefault(); loadJobs(1); };
  const hasMore = page * PAGE_SIZE < total;

  return <div className="dashboard-product">
    <header className="product-page-header"><div><h1>Find jobs</h1><p>Search live listings and apply on the employer’s site. Save a job to track it in Applications.</p></div></header>
    {error && <div className="product-notice" role="alert"><AlertCircle size={16} aria-hidden="true"/><span>{error}</span></div>}
    <section className="product-card">
      <form className="jobs-toolbar" onSubmit={onSubmit}><input className="product-input" aria-label="Job title, company or skill" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Job title, company or skill" maxLength={100}/><input className="product-input" aria-label="City or region" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or region (optional)" maxLength={100}/><button className="product-button primary" type="submit" disabled={loading}><Search size={16} aria-hidden="true"/> Search</button></form>
      {loading ? <div className="empty-product">Loading jobs…</div>
        : notConfigured ? <div className="empty-product"><Search size={28} aria-hidden="true"/><h2>Job search is not set up yet</h2><p>Live listings are coming soon. Please check back later.</p></div>
        : jobs.length ? <div className="job-list">{jobs.map((job) => <article className="job-card" key={job._id}><div className="job-card-top"><div><h3>{job.title}</h3><span className="job-company">{job.company}</span></div><button className="product-button" onClick={() => saveJob(job)} disabled={saving[job._id] || saved[job._id]}><Bookmark size={16} aria-hidden="true" fill={saved[job._id] ? "currentColor" : "none"}/>{saved[job._id] ? "Saved" : "Save"}</button></div><div className="job-meta">{job.location && <span><MapPin size={12} aria-hidden="true"/>{job.location}</span>}{job.type && <span>{job.type}</span>}{formatSalary(job) && <span>{formatSalary(job)}</span>}{job.postedAt && <span>Posted {new Date(job.postedAt).toLocaleDateString()}</span>}</div><p className="job-description">{job.description}</p>{job.tags?.length > 0 && <div className="job-tags">{job.tags.map((tag) => <span className="job-tag" key={tag}>{tag}</span>)}</div>}<div className="job-card-actions">{job.url && <a className="product-button" href={job.url} target="_blank" rel="noopener noreferrer">View job <ExternalLink size={14} aria-hidden="true"/></a>}<button className="product-button primary" onClick={() => saveJob(job)} disabled={saving[job._id] || saved[job._id]}>{saved[job._id] ? "Saved to applications" : "Save to applications"}</button></div></article>)}</div>
        : !error && <div className="empty-product"><Search size={28} aria-hidden="true"/><h2>No matching jobs</h2><p>Try a broader title, company or location.</p></div>}
      {!loading && jobs.length > 0 && (page > 1 || hasMore) && <nav className="job-pagination" aria-label="Job results pages"><button className="product-button" disabled={page <= 1} onClick={() => loadJobs(page - 1)}>Previous</button><span>Page {page}</span><button className="product-button" disabled={!hasMore} onClick={() => loadJobs(page + 1)}>Next</button></nav>}
    </section>
  </div>;
}
