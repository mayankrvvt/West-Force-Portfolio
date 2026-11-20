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
    <header className="product-page-header"><div><span className="product-eyebrow">BUILD & AI</span><h1>My Resumes</h1><p>Keep multiple versions of your resume for different roles and check them against job descriptions.</p></div><button className="product-button primary" onClick={() => navigate("/dashboard/resume-builder")}><Plus size={15}/> Create Resume</button></header>
    {error && <div className="product-notice" role="alert"><AlertCircle size={15}/><span>{error}</span></div>}
    <section className="product-card">
      <div className="product-card-header"><div><h2>Resume versions</h2><p>{loading ? "Loading..." : needsPlan ? "Paid plan needed" : `${resumes.length} resume versions in your library`}</p></div></div>
      {loading ? <div className="empty-product">Loading resumes...</div>
        : needsPlan ? <div className="empty-product"><Lock size={28}/><h2>Saved resumes are a paid feature</h2><p>Upgrade your plan to save resumes and check them with the ATS checker.</p><button className="product-button primary" onClick={() => navigate("/pricing")}>See plans</button></div>
        : !resumes.length ? !error && <div className="empty-product"><FileCheck2 size={28}/><h2>No resumes yet</h2><p>Create your first resume with the AI builder.</p><button className="product-button primary" onClick={() => navigate("/dashboard/resume-builder")}>Open AI Resume Builder</button></div>
        : <div className="resume-list">{resumes.map((resume) => <div className="resume-list-card" key={resume._id}><div className="resume-list-icon"><FileCheck2 size={19}/></div><div className="resume-list-copy"><strong>{resume.title}</strong><span>{[resume.targetRole, `Updated ${new Date(resume.updatedAt || resume.createdAt).toLocaleDateString()}`].filter(Boolean).join(" · ")}</span></div>{typeof resume.atsScore === "number" && <span className="resume-score">ATS {resume.atsScore}</span>}<button className="product-button" title="Check ATS" onClick={() => navigate(`/dashboard/ats-checker?resumeId=${resume._id}`)}><ScanSearch size={14}/></button></div>)}</div>}
    </section>
  </div>;
}
