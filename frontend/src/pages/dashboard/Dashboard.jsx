import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  FileCheck2,
  LockKeyhole,
  LockKeyholeOpen,
  ScanSearch,
  Sparkles,
  UserRound,
} from "lucide-react";
import { apiRequest } from "../../utils/api";
import { formatDate } from "../../utils/formatDate";
import PageSkeleton from "../../components/dashboard/Skeleton";
import StatusBadge from "../../components/dashboard/StatusBadge";
import PortfolioViewsCard from "../../components/dashboard/PortfolioViewsCard";

/* Portfolio steps, in the order a new user usually fills them in. */
const PORTFOLIO_STEPS = [
  {
    key: "profile",
    title: "Add your name and job title",
    text: "This is the first thing employers see on your page.",
    to: "/dashboard/profile",
    action: "Edit profile",
    done: (p) => Boolean(p?.profile?.name && p?.profile?.title),
  },
  {
    key: "about",
    title: "Write a short introduction",
    text: "Two or three sentences about you and the work you do.",
    to: "/onboarding/create-portfolio",
    action: "Write introduction",
    done: (p) => Boolean(p?.hero?.description || p?.about?.description),
  },
  {
    key: "experience",
    title: "Add your work experience",
    text: "List your recent jobs so employers can see what you have done.",
    to: "/onboarding/create-portfolio",
    action: "Add experience",
    done: (p) => (p?.experience?.length || 0) > 0,
  },
  {
    key: "skills",
    title: "Add your skills",
    text: "Skills help employers find the right match quickly.",
    to: "/onboarding/create-portfolio",
    action: "Add skills",
    done: (p) => (p?.skills?.length || 0) > 0,
  },
  {
    key: "documents",
    title: "Upload your documents",
    text: "Certificates and licences make your profile easier to trust.",
    to: "/onboarding/create-portfolio",
    action: "Upload documents",
    done: (p) => (p?.documents?.length || 0) > 0,
  },
  {
    key: "publish",
    title: "Publish your portfolio",
    text: "Get a link you can send to employers.",
    to: "/dashboard/portfolio",
    action: "Go to portfolio",
    done: (p) => p?.status === "published",
  },
];

function greetingFor(date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/* The one thing worth doing next: finish the portfolio first, then the job search. */
function nextActionFor({ nextStep, hasAts, applications }) {
  if (nextStep) {
    return {
      icon: UserRound,
      label: "Finish your portfolio",
      title: nextStep.title,
      text: nextStep.text,
      to: nextStep.to,
      action: nextStep.action,
    };
  }
  if (!hasAts) {
    return {
      icon: ScanSearch,
      label: "Get ready to apply",
      title: "Check your resume against a job",
      text: "See how well your resume matches a job post before you send it.",
      to: "/dashboard/ats-checker",
      action: "Check ATS score",
    };
  }
  if (!applications) {
    return {
      icon: BriefcaseBusiness,
      label: "Start your search",
      title: "Track your first job",
      text: "Find a role you like and track it from saved to offer.",
      to: "/dashboard/jobs",
      action: "Find jobs",
    };
  }
  return {
    icon: BriefcaseBusiness,
    label: "Keep it moving",
    title: "Update your applications",
    text: "Move each job along as you hear back, so you know who to follow up with.",
    to: "/dashboard/applications",
    action: "Open applications",
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);

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
    return () => {
      cancelled = true;
      clearTimeout(copyTimer.current);
    };
  }, []);

  if (loading) return <div className="dashboard-product"><PageSkeleton layout="dashboard" label="Loading your dashboard" /></div>;

  const name = portfolio?.profile?.name;
  const slug = portfolio?.slug;
  const published = portfolio?.status === "published";
  const publicUrl = slug ? `${window.location.origin}/portfolio/${slug}` : "";
  const pinOn = Boolean(portfolio?.documentProtection?.enabled);
  const stats = data?.stats || {};
  const recommendedJobs = data?.recommendedJobs || [];

  const doneCount = PORTFOLIO_STEPS.filter((step) => step.done(portfolio)).length;
  const nextStep = PORTFOLIO_STEPS.find((step) => !step.done(portfolio));
  const percent = Math.round((doneCount / PORTFOLIO_STEPS.length) * 100);

  const activity = [
    ...(data?.recentApplications || []).map((item) => ({
      id: `app-${item._id}`,
      date: item.updatedAt || item.appliedAt || item.createdAt,
      title: `${item.role} at ${item.company}`,
      kind: "Application",
      status: item.status,
    })),
    ...(data?.recentResumes || []).map((item) => ({
      id: `resume-${item._id}`,
      date: item.updatedAt || item.createdAt,
      title: item.title,
      kind: "Resume",
      note: typeof item.atsScore === "number" ? `ATS score ${item.atsScore}` : "",
    })),
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy the link. Select it and copy it yourself.");
    }
  };

  const hasAts = typeof stats.latestAtsScore === "number";
  const now = new Date();
  const firstName = name ? name.split(" ")[0] : "";
  const nextAction = nextActionFor({ nextStep, hasAts, applications: stats.applications || 0 });
  const NextIcon = nextAction.icon;

  return (
    <div className="dashboard-product">
      <header className="product-page-header">
        <div>
          <p className="dashboard-home-date">{now.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1>{greetingFor(now)}{firstName && `, ${firstName}`}</h1>
          <p>Here is where your portfolio and job search stand today.</p>
        </div>
        <div className="product-actions">
          <button type="button" className="product-button" onClick={() => navigate("/dashboard/resume-builder")}><Sparkles size={16} aria-hidden="true"/> Improve a resume</button>
        </div>
      </header>

      {error && <div className="product-error" role="alert"><AlertCircle size={16} aria-hidden="true"/><span>{error}</span></div>}

      <section className="product-card next-step-card" aria-labelledby="next-step-title">
        <div className="next-step-body">
          <span className="next-step-icon" aria-hidden="true"><NextIcon size={20}/></span>
          <div className="next-step-copy">
            <span className="next-step-label">Next best step · {nextAction.label}</span>
            <h2 id="next-step-title">{nextAction.title}</h2>
            <p>{nextAction.text}</p>
          </div>
          <Link className="product-button primary" to={nextAction.to}>{nextAction.action}</Link>
        </div>
        <div className="next-step-progress">
          <div className="next-step-progress-label">
            <span>Portfolio</span>
            <strong>{doneCount} of {PORTFOLIO_STEPS.length} steps done</strong>
          </div>
          <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Portfolio progress">
            <span style={{ transform: `scaleX(${percent / 100})` }} />
          </div>
          {nextStep && <Link className="next-step-progress-next" to={nextStep.to}>Next: {nextStep.title}<ChevronRight size={14} aria-hidden="true"/></Link>}
        </div>
      </section>

      <ul className="product-stat-grid" aria-label="Your numbers">
        <Stat to="/dashboard/ats-checker" label="Latest ATS score" value={hasAts ? stats.latestAtsScore : "None yet"} suffix={hasAts ? "/100" : ""} />
        <Stat to="/dashboard/resumes" label="Resume versions" value={stats.resumes || 0} />
        <Stat to="/dashboard/applications" label="Applications" value={stats.applications || 0} />
        <Stat to="/dashboard/applications" label="Interviews" value={stats.interviews || 0} />
      </ul>

      <div className="product-dashboard-grid">
        <div className="dashboard-home-column">
          {published && <PortfolioViewsCard compact />}
          <ActivityCard activity={activity} />
          {recommendedJobs.length > 0 && <section className="product-card">
            <div className="product-card-header"><div><h2>Recommended jobs</h2><p>Picked from your recent job searches.</p></div><Link className="product-button compact" to="/dashboard/jobs">See all jobs</Link></div>
            <ul className="product-activity-list">
              {recommendedJobs.map((job) => (
                <li className="product-activity-item" key={job._id}><div><strong>{job.title}</strong><p className="product-meta">{job.company && <span>{job.company}</span>}{job.location && <span>{job.location}</span>}</p></div>{job.url && <a className="product-link" href={job.url} target="_blank" rel="noopener noreferrer">View<span className="sr-only"> {job.title}</span></a>}</li>
              ))}
            </ul>
          </section>}
        </div>
        <div className="dashboard-home-column">
        <section className="product-card">
          <div className="product-card-header">
            <div><h2>Your portfolio</h2><p>{portfolio?.profile?.title || "Your public page, built from your saved profile."}</p></div>
            <span className={`status-badge ${published ? "status-offer" : "status-saved"}`}>{published ? "Published" : "Draft"}</span>
          </div>
          <div className="product-portfolio-preview">
            {publicUrl && published ? (
              <div className="portfolio-link-row">
                <span className="portfolio-link-text" title={publicUrl}>{publicUrl.replace(/^https?:\/\//, "")}</span>
                <button type="button" className="product-button compact" onClick={copyLink} aria-live="polite">
                  {copied ? <Check size={16} aria-hidden="true"/> : <Copy size={16} aria-hidden="true"/>}
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>
            ) : (
              <p>Publish your portfolio to get a link you can share with employers.</p>
            )}
            <p className="portfolio-pin-status">
              {pinOn ? <LockKeyhole size={16} aria-hidden="true"/> : <LockKeyholeOpen size={16} aria-hidden="true"/>}
              {pinOn ? "Your documents are locked with a PIN." : "Your documents can be opened by anyone with the link."}
            </p>
            <div className="product-inline-actions">
              <Link className="product-button compact" to="/dashboard/portfolio">Open portfolio</Link>
              {slug && published && <a className="product-button compact" href={`/portfolio/${slug}`} target="_blank" rel="noreferrer"><ExternalLink size={14} aria-hidden="true"/> View public page</a>}
            </div>
          </div>
        </section>
        <section className="product-card">
          <div className="product-card-header"><div><h2>Quick actions</h2></div></div>
          <div className="product-quick-grid">
            <Quick icon={UserRound} title="Edit profile" text="Update your details" to="/dashboard/profile" />
            <Quick icon={Sparkles} title="AI resume" text="Improve a resume" to="/dashboard/resume-builder" />
            <Quick icon={ScanSearch} title="Check ATS" text="Match a resume to a job" to="/dashboard/ats-checker" />
            <Quick icon={BriefcaseBusiness} title="Find jobs" text="Search open roles" to="/dashboard/jobs" />
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}

function ActivityCard({ activity }) {
  return (
      <section className="product-card">
        <div className="product-card-header"><div><h2>Recent activity</h2><p>Your latest applications and resumes.</p></div></div>
        {activity.length ? (
          <ol className="activity-timeline">
            {activity.map((item) => (
              <li className="activity-item" key={item.id}>
                <span className="activity-dot" aria-hidden="true">{item.kind === "Resume" ? <FileCheck2 size={14}/> : <BriefcaseBusiness size={14}/>}</span>
                <div className="activity-copy">
                  <strong>{item.title}</strong>
                  <span className="product-meta">
                    <span>{item.kind}</span>
                    {item.note && <span>{item.note}</span>}
                  </span>
                </div>
                <div className="activity-side">
                  {item.status && <StatusBadge status={item.status} />}
                  {item.date && <time dateTime={new Date(item.date).toISOString()}>{formatDate(item.date)}</time>}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-product">
            <p>No activity yet. Save a job or create a resume to get started.</p>
            <Link className="product-button primary" to="/dashboard/jobs">Find jobs</Link>
          </div>
        )}
      </section>
  );
}

function Stat({ to, label, value, suffix }) {
  return (
    <li>
      <Link className="product-stat" to={to}>
        <span className="product-stat-value">{value}{suffix && <small>{suffix}</small>}</span>
        <span className="product-stat-label">{label}</span>
      </Link>
    </li>
  );
}

function Quick({ icon, title, text, to }) {
  const Icon = icon;
  return (
    <Link className="product-quick-action" to={to}>
      <span className="product-quick-icon"><Icon size={16} aria-hidden="true"/></span>
      <strong>{title}</strong>
      <span>{text}</span>
      <ChevronRight className="product-quick-chevron" size={16} aria-hidden="true"/>
    </Link>
  );
}
