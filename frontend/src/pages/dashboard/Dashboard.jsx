import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BriefcaseBusiness,
  ScanSearch,
  Sparkles,
  UserRound,
} from "lucide-react";
import { apiRequest } from "../../utils/api";

export default function Dashboard() {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [portfolioResult, summary] = await Promise.all([
          apiRequest("/api/portfolios/me").catch(() => null),
          apiRequest("/api/dashboard/summary").catch((err) => {
            if (!cancelled) setError(err.message || "Could not load your dashboard numbers.");
            return null;
          }),
        ]);
        if (cancelled) return;
        setPortfolio(portfolioResult?.portfolio || portfolioResult?.data || portfolioResult || null);
        setData(summary);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="dashboard-product"><div className="empty-product">Loading your workspace…</div></div>;

  const name = portfolio?.profile?.name;
  const slug = portfolio?.slug;
  const stats = data?.stats || {};
  const recentApplications = data?.recentApplications || [];
  const recentResumes = data?.recentResumes || [];
  const recommendedJobs = data?.recommendedJobs || [];

  return (
    <div className="dashboard-product">
      <header className="product-page-header">
        <div>
          <h1>{name ? `Welcome back, ${name}` : "Welcome back"}</h1>
          <p>Build your portfolio, improve your resume and keep your job search in one place.</p>
        </div>
        <div className="product-actions">
          <button type="button" className="product-button primary" onClick={() => navigate("/dashboard/resume-builder")}><Sparkles size={16} aria-hidden="true"/> Improve a resume</button>
        </div>
      </header>
      {error && <div className="product-notice" role="alert"><AlertCircle size={16} aria-hidden="true"/><span>{error}</span></div>}
      <dl className="product-stat-grid">
        <Stat label="Latest ATS score" value={typeof stats.latestAtsScore === "number" ? stats.latestAtsScore : "–"} suffix={typeof stats.latestAtsScore === "number" ? "/100" : ""} />
        <Stat label="Resume versions" value={stats.resumes || 0} />
        <Stat label="Applications" value={stats.applications || 0} />
        <Stat label="Interviews" value={stats.interviews || 0} />
      </dl>
      <div className="product-dashboard-grid">
        <section className="product-card">
          <div className="product-card-header">
            <div><h2>Your portfolio</h2><p>Your public page, built from your saved profile.</p></div>
            <span className={`badge ${portfolio?.status === "published" ? "badge-success" : ""}`}>{portfolio?.status === "published" ? "Published" : "Draft"}</span>
          </div>
          <div className="product-portfolio-preview">
            <h3>{portfolio?.profile?.title || "Your professional profile"}</h3>
            <p>{portfolio?.hero?.description || "Bring your experience, skills and documents together on one page employers can open."}</p>
            <div className="product-inline-actions">
              <button type="button" className="product-button" onClick={() => navigate("/dashboard/portfolio")}>Open portfolio</button>
              {slug && <a className="product-button" href={`/portfolio/${slug}`} target="_blank" rel="noreferrer">View public page</a>}
            </div>
          </div>
        </section>
        <section className="product-card">
          <div className="product-card-header"><div><h2>Quick actions</h2><p>Jump to your next task.</p></div></div>
          <div className="product-quick-grid">
            <Quick icon={UserRound} title="Edit profile" text="Update your details" onClick={() => navigate("/dashboard/profile")} />
            <Quick icon={Sparkles} title="AI resume" text="Improve a resume" onClick={() => navigate("/dashboard/resume-builder")} />
            <Quick icon={ScanSearch} title="Check ATS" text="Match a resume to a job" onClick={() => navigate("/dashboard/ats-checker")} />
            <Quick icon={BriefcaseBusiness} title="Find jobs" text="Search open roles" onClick={() => navigate("/dashboard/jobs")} />
          </div>
        </section>
      </div>
      <section className="product-card">
        <div className="product-card-header"><div><h2>Recent activity</h2><p>Your latest applications and resumes.</p></div></div>
        {recentApplications.length || recentResumes.length ? <ul className="product-activity-list">
          {recentApplications.map((item) => (
            <li className="product-activity-item" key={`app-${item._id}`}><div><strong>{item.role} at {item.company}</strong><p className="product-meta"><span>Application</span><span>{item.status}</span></p></div><time>{new Date(item.updatedAt).toLocaleDateString()}</time></li>
          ))}
          {recentResumes.map((item) => (
            <li className="product-activity-item" key={`resume-${item._id}`}><div><strong>{item.title}</strong><p className="product-meta"><span>Resume</span>{typeof item.atsScore === "number" && <span>ATS score {item.atsScore}</span>}</p></div><time>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</time></li>
          ))}
        </ul> : <div className="empty-product"><p>No activity yet. Save a job or create a resume to get started.</p><button type="button" className="product-button primary" onClick={() => navigate("/dashboard/jobs")}>Find jobs</button></div>}
      </section>
      {recommendedJobs.length > 0 && <section className="product-card">
        <div className="product-card-header"><div><h2>Recommended jobs</h2><p>Picked from your recent job searches.</p></div><button type="button" className="product-button" onClick={() => navigate("/dashboard/jobs")}>See all jobs</button></div>
        <ul className="product-activity-list">
          {recommendedJobs.map((job) => (
            <li className="product-activity-item" key={job._id}><div><strong>{job.title}</strong><p className="product-meta">{job.company && <span>{job.company}</span>}{job.location && <span>{job.location}</span>}</p></div>{job.url && <a className="product-link" href={job.url} target="_blank" rel="noopener noreferrer">View<span className="sr-only"> {job.title}</span></a>}</li>
          ))}
        </ul>
      </section>}
    </div>
  );
}
function Stat({label,value,suffix}) {
  return <div className="product-stat"><dt className="product-stat-label">{label}</dt><dd className="product-stat-value">{value}{suffix && <small>{suffix}</small>}</dd></div>;
}
function Quick({icon: Icon,title,text,onClick}) {
  return <button type="button" className="product-quick-action" onClick={onClick}><Icon size={18} aria-hidden="true"/><div><strong>{title}</strong><span>{text}</span></div></button>;
}
