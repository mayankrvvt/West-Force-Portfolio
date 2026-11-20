import { useEffect, useState } from "react";
import { AlertCircle, Bookmark, BriefcaseBusiness, CalendarDays, Check, CircleCheck, ExternalLink, EyeOff, FilePenLine, MapPin, PauseCircle, Search, Sparkles, Wallet } from "lucide-react";
import { PAUSED_TEXT, useFeature } from "../../hooks/useSiteStatus";
import { Link } from "react-router-dom";
import { formatSalary, getJobsForMe, hideJob, searchJobs, unhideJob } from "../../services/jobService";
import { getApplications, saveJobApplication } from "../../services/applicationService";
import { formatDate } from "../../utils/formatDate";
import { SkeletonRows } from "../../components/dashboard/Skeleton";

const PAGE_SIZE = 20;

const PAGE_HEADER = <header className="product-page-header"><div><h1>Find jobs</h1><p>Search live listings and apply on the employer’s site. Track a job to follow it in Applications.</p></div></header>;

function JobsPaused({ message }) {
  return <div className="dashboard-product">
    {PAGE_HEADER}
    <div className="empty-product jobs-paused" role="status">
      <span className="empty-product-icon"><PauseCircle size={22} aria-hidden="true"/></span>
      <h2>{PAUSED_TEXT.jobs}</h2>
      <p>{message || "Job search is off for a short while. Your tracked jobs are still in Applications."}</p>
      <Link className="product-button" to="/dashboard/applications">Go to Applications</Link>
    </div>
  </div>;
}

export default function Jobs() {
  const jobsOn = useFeature("jobs");
  return jobsOn ? <JobSearch /> : <JobsPaused />;
}

function JobSearch() {
  const [pausedMessage, setPausedMessage] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  // The search that produced the current results. Pagination and the count label use this, not the live inputs.
  const [searched, setSearched] = useState({ query: "", location: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState({});
  const [saving, setSaving] = useState({});

  const loadJobs = async (nextPage = 1, criteria = { query, location }) => {
    setLoading(true);
    setError("");
    try {
      const result = await searchJobs({ ...criteria, page: nextPage, limit: PAGE_SIZE });
      setJobs(result.jobs || []);
      setTotal(result.total || 0);
      setSearched(criteria);
      setPage(nextPage);
    } catch (err) {
      setJobs([]);
      if (err.code === "FEATURE_OFF") {
        setPausedMessage(err.message || "");
        return;
      }
      setError(err.message || "Could not load jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs(1);
    // Mark jobs that are already in Applications. Best effort only.
    let active = true;
    getApplications()
      .then((items) => {
        if (!active) return;
        const ids = Object.fromEntries(items.filter((item) => item.jobId).map((item) => [String(item.jobId), true]));
        setSaved((current) => ({ ...ids, ...current }));
      })
      .catch(() => {});
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveJob = async (job) => {
    setSaving((current) => ({ ...current, [job._id]: true }));
    try {
      await saveJobApplication(job);
      setSaved((current) => ({ ...current, [job._id]: true }));
    } catch (err) {
      setError(err.message || "Could not track the job. Please try again.");
    } finally {
      setSaving((current) => ({ ...current, [job._id]: false }));
    }
  };

  const onSubmit = (event) => { event.preventDefault(); loadJobs(1); };
  const hasMore = page * PAGE_SIZE < total;

  if (pausedMessage !== null) return <JobsPaused message={pausedMessage} />;

  return <div className="dashboard-product">
    {PAGE_HEADER}
    <JobsForYou saved={saved} saving={saving} onSave={saveJob}/>
    <div className="jobs-section-header"><h2 id="all-jobs-title">Search all jobs</h2></div>
    {error && <div className="product-error" role="alert"><AlertCircle size={16} aria-hidden="true"/><span>{error}</span></div>}
    <form className="jobs-toolbar" onSubmit={onSubmit} role="search">
      <label className="jobs-search-field">
        <Search size={16} aria-hidden="true"/>
        <input className="product-input" aria-label="Job title, company or skill" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Job title, company or skill" maxLength={100}/>
      </label>
      <label className="jobs-search-field">
        <MapPin size={16} aria-hidden="true"/>
        <input className="product-input" aria-label="City or region" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City or region" maxLength={100}/>
      </label>
      <button className="product-button primary" type="submit" disabled={loading}>Search</button>
    </form>
    {loading ? <div className="product-card"><SkeletonRows count={4} label="Loading jobs"/></div>
      : jobs.length ? <>
        <p className="jobs-result-count" aria-live="polite">{total === 1 ? "1 job" : `${total.toLocaleString("en-CA")} jobs`}{searched.query.trim() ? ` for “${searched.query.trim()}”` : ""}</p>
        <div className="job-list">{jobs.map((job) => <JobCard key={job._id} job={job} isSaved={saved[job._id]} isSaving={saving[job._id]} onSave={saveJob}/>)}</div>
      </>
      : !error && <div className="empty-product"><span className="empty-product-icon"><Search size={22} aria-hidden="true"/></span><h2>No matching jobs</h2><p>Try a broader title, company or location.</p></div>}
    {!loading && jobs.length > 0 && (page > 1 || hasMore) && <nav className="job-pagination" aria-label="Job results pages"><button className="product-button compact" disabled={page <= 1} onClick={() => loadJobs(page - 1, searched)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE)).toLocaleString("en-CA")}</span><button className="product-button compact" disabled={!hasMore} onClick={() => loadJobs(page + 1, searched)}>Next</button></nav>}
  </div>;
}

const PREFERENCES_LINK = "/dashboard/settings#job-preferences";

/** "Jobs for you": jobs ranked from the user's job preferences, resume and skills. */
function JobsForYou({ saved, saving, onSave }) {
  const [state, setState] = useState({ loading: true, jobs: [], error: "" });

  useEffect(() => {
    let active = true;
    getJobsForMe()
      .then((jobs) => { if (active) setState({ loading: false, jobs, error: "" }); })
      .catch((err) => {
        if (!active) return;
        // The search below shows the paused page when jobs are off.
        setState({ loading: false, jobs: [], error: err.code === "FEATURE_OFF" ? "" : err.message || "Could not load jobs for you. Please try again." });
      });
    return () => { active = false; };
  }, []);

  // Jobs marked "Not interested" stay in place as a "Hidden. Undo" line until the next visit.
  const [hidden, setHidden] = useState({});
  const [hideError, setHideError] = useState("");
  const setJobHidden = async (job, isHidden) => {
    setHideError("");
    setHidden((current) => ({ ...current, [job._id]: isHidden }));
    try {
      await (isHidden ? hideJob(job._id) : unhideJob(job._id));
    } catch (err) {
      setHidden((current) => ({ ...current, [job._id]: !isHidden }));
      setHideError(err.message || (isHidden ? "Could not hide the job. Please try again." : "Could not undo. Please try again."));
    }
  };
  const shownCount = state.jobs.filter((job) => !hidden[job._id]).length;

  return <section className="jobs-for-you" aria-labelledby="jobs-for-you-title">
    <div className="jobs-section-header">
      <h2 id="jobs-for-you-title"><Sparkles size={16} aria-hidden="true"/>Jobs for you{!state.loading && shownCount > 0 && <span className="application-count">{shownCount}</span>}</h2>
      <Link className="product-link" to={PREFERENCES_LINK}>Edit job preferences</Link>
    </div>
    {state.loading ? <div className="product-card"><SkeletonRows count={2} label="Loading jobs for you"/></div>
      : state.error ? <div className="product-error" role="alert"><AlertCircle size={16} aria-hidden="true"/><span>{state.error}</span></div>
      : state.jobs.length ? <>
        {hideError && <div className="product-error" role="alert"><AlertCircle size={16} aria-hidden="true"/><span>{hideError}</span></div>}
        <div className="job-list">{state.jobs.map((job) => hidden[job._id]
          ? <p className="job-hidden-note" key={job._id} role="status"><span>Hidden.</span><button type="button" onClick={() => setJobHidden(job, false)} aria-label={`Undo hiding ${job.title}`}>Undo</button></p>
          : <JobCard key={job._id} job={job} reasons={job.reasons} isSaved={saved[job._id]} isSaving={saving[job._id]} onSave={onSave} onHide={(item) => setJobHidden(item, true)}/>)}</div>
      </>
      : <div className="jobs-for-you-empty">
        <p>Nothing here yet</p>
        <Link className="product-link" to={PREFERENCES_LINK}>Set your job preferences</Link>
      </div>}
  </section>;
}

function JobCard({ job, reasons = [], isSaved, isSaving, onSave, onHide }) {
  const salary = formatSalary(job);
  return <article className="job-card">
    <span className="job-avatar" aria-hidden="true">{(job.company || job.title || "?").trim().charAt(0).toUpperCase()}</span>
    <div className="job-card-body">
      <div className="job-card-top">
        <div className="job-card-title">
          <h3>{job.title}</h3>
          {job.company && <p className="job-company">{job.company}</p>}
        </div>
        <div className="job-card-actions">
          <Link className="product-button compact" to={`/dashboard/tailor-resume?jobId=${encodeURIComponent(job._id)}`} aria-label={`Tailor your resume to ${job.title}`}><FilePenLine size={14} aria-hidden="true"/> Tailor resume</Link>
          {job.url && <a className="product-button compact" href={job.url} target="_blank" rel="noopener noreferrer">View job <ExternalLink size={14} aria-hidden="true"/></a>}
          {onHide && <button type="button" className="product-button compact" onClick={() => onHide(job)} aria-label={`Not interested in ${job.title}`}><EyeOff size={14} aria-hidden="true"/> Not interested</button>}
          {isSaved
            ? <Link className="job-save-button saved" to="/dashboard/applications" aria-label={`${job.title} is tracked. Open Applications`}><CircleCheck size={16} aria-hidden="true"/>Tracked</Link>
            : <button type="button" className="job-save-button" onClick={() => onSave(job)} disabled={isSaving} aria-label={`Track ${job.title} in Applications`}>
              <Bookmark size={16} aria-hidden="true"/>
              {isSaving ? "Tracking…" : "Track this job"}
            </button>}
        </div>
      </div>
      {reasons.length > 0 && <ul className="job-reasons" aria-label="Why this job fits">{reasons.map((reason) => <li className="job-reason" key={reason}><Check size={12} aria-hidden="true"/>{reason}</li>)}</ul>}
      <div className="job-meta">
        {job.location && <span><MapPin size={14} aria-hidden="true"/>{job.location}</span>}
        {job.type && <span><BriefcaseBusiness size={14} aria-hidden="true"/>{job.type}</span>}
        {salary && <span><Wallet size={14} aria-hidden="true"/>{salary}</span>}
        {job.postedAt && <span><CalendarDays size={14} aria-hidden="true"/>Posted {formatDate(job.postedAt)}</span>}
      </div>
      {job.description && <p className="job-description">{job.description}</p>}
      {job.tags?.length > 0 && <ul className="job-tags" aria-label="Tags">{job.tags.map((tag) => <li className="job-tag" key={tag}>{tag}</li>)}</ul>}
    </div>
  </article>;
}
