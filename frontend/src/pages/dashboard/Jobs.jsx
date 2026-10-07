import { useEffect, useState } from "react";
import { Bookmark, ExternalLink, MapPin, Search, Sparkles } from "lucide-react";
import { getMockJobs, saveMockApplication } from "../../services/mockApi";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("Any location");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState({});

  const loadJobs = async () => {
    setLoading(true);
    try { setJobs(await getMockJobs({ query, location })); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadJobs(); }, []);

  const saveJob = async (job) => {
    await saveMockApplication(job);
    setSaved((current) => ({ ...current, [job.id]: true }));
  };

  return <div className="dashboard-product">
    <header className="product-page-header"><div><span className="product-eyebrow">CAREER</span><h1>Find Jobs</h1><p>Discover demo opportunities and open the employer's career page or job portal to complete the application.</p></div></header>
    <div className="product-notice"><Sparkles size={15}/><span><strong>Demo Jobs API:</strong> these listings are sample data. The production version can connect to your job source and use each listing's real <code>applyUrl</code>.</span></div>
    <section className="product-card">
      <div className="jobs-toolbar"><input className="product-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, company or skill"/><select className="product-select" value={location} onChange={(e) => setLocation(e.target.value)}><option>Any location</option><option>Toronto</option><option>Vancouver</option><option>Calgary</option></select><button className="product-button primary" onClick={loadJobs}><Search size={14}/> Search</button></div>
      {loading ? <div className="empty-product">Loading opportunities...</div> : <div className="job-list">{jobs.map((job) => <article className="job-card" key={job.id}><div className="job-card-top"><div><h3>{job.title}</h3><span className="job-company">{job.company}</span></div><button className="product-button" onClick={() => saveJob(job)}><Bookmark size={14} fill={saved[job.id] ? "currentColor" : "none"}/>{saved[job.id] ? "Saved" : "Save"}</button></div><div className="job-meta"><span><MapPin size={11} style={{verticalAlign:"-2px",marginRight:3}}/>{job.location}</span><span>{job.type}</span><span>{job.salary}</span><span>{job.posted}</span></div><p className="job-description">{job.description}</p><div className="job-tags">{job.tags.map((tag) => <span className="job-tag" key={tag}>{tag}</span>)}</div><div className="job-card-actions"><a className="product-button" href={job.applyUrl} target="_blank" rel="noreferrer">View job <ExternalLink size={13}/></a><button className="product-button primary" onClick={() => saveJob(job)}>Save to Applications</button></div></article>)}</div>}
      {!loading && !jobs.length && <div className="empty-product"><Search size={28}/><h2>No matching jobs</h2><p>Try a broader title, company or location.</p></div>}
    </section>
  </div>;
}
