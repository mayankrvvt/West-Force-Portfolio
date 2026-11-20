import { useEffect, useState } from "react";
import { AlertCircle, FileCheck2, FilePenLine, Lightbulb, Lock, Plus, ScanSearch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../utils/api";
import { formatDate } from "../../utils/formatDate";
import PageSkeleton from "../../components/dashboard/Skeleton";

export default function Resumes() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [needsPlan, setNeedsPlan] = useState(false);

  useEffect(() => {
    apiRequest("/api/resumes")
      .then((result) => setResumes(result.resumes || []))
      .catch((err) => {
        if (err.status === 402) setNeedsPlan(true);
        else setError(err.message || "Could not load your resumes.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-product"><PageSkeleton layout="list" label="Loading your resumes" /></div>;

  return <div className="dashboard-product">
    <header className="product-page-header"><div><h1>My resumes</h1><p>Keep a version of your resume for each kind of role and check it against job descriptions.</p></div><button className="product-button primary" onClick={() => navigate("/dashboard/resume-builder")}><Plus size={16} aria-hidden="true"/> Create resume</button></header>
    {error && <div className="product-error" role="alert"><AlertCircle size={16} aria-hidden="true"/><span>{error}</span></div>}
    {needsPlan ? <div className="empty-product"><span className="empty-product-icon"><Lock size={22} aria-hidden="true"/></span><h2>Saved resumes are a paid feature</h2><p>Upgrade your plan to save resumes and check them with the ATS checker.</p><button className="product-button primary" onClick={() => navigate("/pricing")}>See plans</button></div>
      : !resumes.length ? !error && <div className="empty-product"><span className="empty-product-icon"><FileCheck2 size={22} aria-hidden="true"/></span><h2>Nothing here yet</h2><p>Create your first resume with the AI builder. It takes a few minutes.</p><button className="product-button primary" onClick={() => navigate("/dashboard/resume-builder")}>Create your first resume</button></div>
      : <section className="product-card">
        <div className="product-card-header"><div><h2>Resume versions <span className="application-count">{resumes.length}</span></h2><p>One version for each kind of role works best.</p></div></div>
        <ul className="resume-list">{resumes.map((resume) => {
          const updated = formatDate(resume.updatedAt || resume.createdAt);
          return <li className="resume-list-card" key={resume._id}>
            <span className="resume-list-icon"><FileCheck2 size={18} aria-hidden="true"/></span>
            <div className="resume-list-copy">
              <strong>{resume.title}</strong>
              <span className="product-meta">{resume.targetRole && <span>{resume.targetRole}</span>}{updated && <span>Updated {updated}</span>}</span>
            </div>
            {typeof resume.atsScore === "number"
              ? <span className={`resume-score ${scoreLevel(resume.atsScore)}`}>ATS <strong>{resume.atsScore}</strong></span>
              : <span className="resume-score">Not checked yet</span>}
            <div className="resume-list-actions">
              <button type="button" className="product-button compact" onClick={() => navigate(`/dashboard/ats-checker?resumeId=${resume._id}`)}><ScanSearch size={16} aria-hidden="true"/> Check against a job</button>
              <button type="button" className="product-button compact" onClick={() => navigate(`/dashboard/tailor-resume?resumeId=${resume._id}`)}><FilePenLine size={16} aria-hidden="true"/> Tailor resume</button>
            </div>
          </li>;
        })}</ul>
      </section>}
    {!needsPlan && <aside className="product-tip">
      <Lightbulb size={18} aria-hidden="true"/>
      <div>
        <strong>Aim for a score of 80 or more</strong>
        <p>Paste the job posting into the ATS checker and add the missing keywords that truly match your experience.</p>
      </div>
    </aside>}
  </div>;
}

function scoreLevel(score) {
  if (score >= 80) return "high";
  if (score >= 60) return "mid";
  return "low";
}
