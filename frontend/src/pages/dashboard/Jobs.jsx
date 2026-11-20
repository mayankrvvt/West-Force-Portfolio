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
    <header className="product-page-header"><div><span className="product-eyebrow">CAREER</span><h1>Find Jobs</h1><p>Search live job listings and open the employer's page to apply. Save jobs to track them in Applications.</p></div></header>
    {error && <div className="product-notice" role="alert"><AlertCircle size={15}/><span>{error}</span></div>}
    <section className="product-card">
      <form className="jobs-toolbar" onSubmit={onSubmit}><input className="product-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, company or skill" maxLength={100}/><input className="product-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or region (optional)" maxLength={100}/><button className="product-button primary" type="submit" disabled={loading}><Search size={14}/> Search</button></form>
      {loading ? <div className="empty-product">Loading opportunities...</div>
        : notConfigured ? <div className="empty-product"><Search size={28}/><h2>Job search is not set up yet</h2><p>Live job listings are coming soon. Please check back later.</p></div>
        : jobs.length ? <div className="job-list">{jobs.map((job) => <article className="job-card" key={job._id}><div className="job-card-top"><div><h3>{job.title}</h3><span className="job-company">{job.company}</span></div><button className="product-button" onClick={() => saveJob(job)} disabled={saving[job._id] || saved[job._id]}><Bookmark size={14} fill={saved[job._id] ? "currentColor" : "none"}/>{saved[job._id] ? "Saved" : "Save"}</button></div><div className="job-meta">{job.location && <span><MapPin size={11} style={{verticalAlign:"-2px",marginRight:3}}/>{job.location}</span>}{job.type && <span>{job.type}</span>}{formatSalary(job) && <span>{formatSalary(job)}</span>}{job.postedAt && <span>Posted {new Date(job.postedAt).toLocaleDateString()}</span>}</div><p className="job-description">{job.description}</p>{job.tags?.length > 0 && <div className="job-tags">{job.tags.map((tag) => <span className="job-tag" key={tag}>{tag}</span>)}</div>}<div className="job-card-actions">{job.url && <a className="product-button" href={job.url} target="_blank" rel="noopener noreferrer">View job <ExternalLink size={13}/></a>}<button className="product-button primary" onClick={() => saveJob(job)} disabled={saving[job._id] || saved[job._id]}>{saved[job._id] ? "Saved to Applications" : "Save to Applications"}</button></div></article>)}</div>
        : !error && <div className="empty-product"><Search size={28}/><h2>No matching jobs</h2><p>Try a broader title, company or location.</p></div>}
      {!loading && jobs.length > 0 && (page > 1 || hasMore) && <div className="job-card-actions" style={{justifyContent:"center",marginTop:16}}><button className="product-button" disabled={page <= 1} onClick={() => loadJobs(page - 1)}>Previous</button><span style={{fontSize:11,alignSelf:"center"}}>Page {page}</span><button className="product-button" disabled={!hasMore} onClick={() => loadJobs(page + 1)}>Next</button></div>}
    </section>
  </div>;
}
