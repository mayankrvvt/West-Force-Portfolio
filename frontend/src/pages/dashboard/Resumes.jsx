import { useEffect, useState } from "react";
import { AlertCircle, FileCheck2, Lock, Plus, ScanSearch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../../utils/api";

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

  return <div className="dashboard-product">
    <header className="product-page-header"><div><h1>My resumes</h1><p>Keep a version of your resume for each kind of role and check it against job descriptions.</p></div><button className="product-button primary" onClick={() => navigate("/dashboard/resume-builder")}><Plus size={16} aria-hidden="true"/> Create resume</button></header>
    {error && <div className="product-notice" role="alert"><AlertCircle size={16} aria-hidden="true"/><span>{error}</span></div>}
    <section className="product-card">
      <div className="product-card-header"><div><h2>Resume versions</h2><p>{loading ? "Loading…" : needsPlan ? "Paid plan needed" : `${resumes.length} saved ${resumes.length === 1 ? "version" : "versions"}`}</p></div></div>
      {loading ? <div className="empty-product">Loading resumes…</div>
        : needsPlan ? <div className="empty-product"><Lock size={28} aria-hidden="true"/><h2>Saved resumes are a paid feature</h2><p>Upgrade your plan to save resumes and check them with the ATS checker.</p><button className="product-button primary" onClick={() => navigate("/pricing")}>See plans</button></div>
        : !resumes.length ? !error && <div className="empty-product"><FileCheck2 size={28} aria-hidden="true"/><h2>No resumes yet</h2><p>Create your first resume with the AI builder. It takes a few minutes.</p><button className="product-button primary" onClick={() => navigate("/dashboard/resume-builder")}>Create your first resume</button></div>
        : <div className="resume-list">{resumes.map((resume) => <div className="resume-list-card" key={resume._id}><div className="resume-list-icon"><FileCheck2 size={18} aria-hidden="true"/></div><div className="resume-list-copy"><strong>{resume.title}</strong><span className="product-meta">{resume.targetRole && <span>{resume.targetRole}</span>}<span>Updated {new Date(resume.updatedAt || resume.createdAt).toLocaleDateString()}</span></span></div>{typeof resume.atsScore === "number" && <span className="resume-score">ATS score {resume.atsScore}</span>}<button type="button" className="product-button" onClick={() => navigate(`/dashboard/ats-checker?resumeId=${resume._id}`)}><ScanSearch size={16} aria-hidden="true"/> Check ATS</button></div>)}</div>}
    </section>
  </div>;
}
