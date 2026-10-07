import { useEffect, useState } from "react";
import { Download, FileCheck2, MoreHorizontal, Plus, ScanSearch, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getMockResumes } from "../../services/mockApi";

export default function Resumes() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getMockResumes().then(setResumes).finally(() => setLoading(false)); }, []);

  return <div className="dashboard-product">
    <header className="product-page-header"><div><span className="product-eyebrow">BUILD & AI</span><h1>My Resumes</h1><p>Keep multiple versions of your resume for different roles and track their simulated ATS performance.</p></div><button className="product-button primary" onClick={() => navigate("/dashboard/resume-builder")}><Plus size={15}/> Create Resume</button></header>
    <div className="product-notice"><Sparkles size={15}/><span>Resume library data is currently powered by a local demo API and persists in this browser. It is ready to be replaced with your MongoDB Resume collection.</span></div>
    <section className="product-card">
      <div className="product-card-header"><div><h2>Resume versions</h2><p>{loading ? "Loading..." : `${resumes.length} resume versions in your library`}</p></div></div>
      {!resumes.length && !loading ? <div className="empty-product"><FileCheck2 size={28}/><h2>No resumes yet</h2><p>Create your first resume with the AI builder.</p><button className="product-button primary" onClick={() => navigate("/dashboard/resume-builder")}>Open AI Resume Builder</button></div> : <div className="resume-list">{resumes.map((resume) => <div className="resume-list-card" key={resume.id}><div className="resume-list-icon"><FileCheck2 size={19}/></div><div className="resume-list-copy"><strong>{resume.title}</strong><span>{resume.fileName} · Version {resume.version} · Updated {new Date(resume.updatedAt).toLocaleDateString()}</span></div><span className="resume-score">ATS {resume.atsScore}</span><button className="product-button" title="Check ATS" onClick={() => navigate("/dashboard/ats-checker")}><ScanSearch size={14}/></button><button className="product-button" title="Demo download" onClick={() => window.print()}><Download size={14}/></button><button className="product-button" title="More"><MoreHorizontal size={14}/></button></div>)}</div>}
    </section>
  </div>;
}
