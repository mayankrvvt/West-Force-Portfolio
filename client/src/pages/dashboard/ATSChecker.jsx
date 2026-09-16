import { useState } from "react";
import { AlertCircle, CheckCircle2, FileSearch, ScanSearch, Sparkles } from "lucide-react";
import { checkATSResume } from "../../services/mockApi";

const sampleResume = `Software Developer\nReact JavaScript Node.js Express MongoDB REST APIs\nBuilt full-stack applications, APIs and responsive interfaces.\nExperience with Git, SQL, Python and C++.\n`;

export default function ATSChecker() {
  const [file, setFile] = useState(null);
  const [resumeText, setResumeText] = useState(sampleResume);
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFile = (event) => {
    const next = event.target.files?.[0];
    if (!next) return;
    setFile(next);
    setResult(null);
    setResumeText((current) => current || sampleResume);
  };

  const runCheck = async () => {
    setLoading(true);
    try { setResult(await checkATSResume({ resumeText, jobDescription })); }
    finally { setLoading(false); }
  };

  return (
    <div className="dashboard-product">
      <header className="product-page-header"><div><span className="product-eyebrow">BUILD & AI</span><h1>ATS Resume Checker</h1><p>Compare a resume with a job description and get a clear breakdown of structure, keywords and formatting.</p></div></header>
      <div className="product-notice"><ScanSearch size={15}/><span><strong>Demo ATS API:</strong> scoring is currently calculated locally from your supplied text. Replace this service with the production ATS engine later.</span></div>

      <div className="ats-layout">
        <section>
          <div className="product-card">
            <div className="product-card-header"><div><h2>Resume</h2><p>Upload a resume and provide text for this demo checker.</p></div></div>
            <label className="product-upload-zone" style={{minHeight:170}}><input type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleFile} hidden/><div><FileSearch size={27}/><h3>{file ? file.name : "Upload resume"}</h3><p>{file ? "Selected for ATS analysis." : "PDF, DOC, DOCX or TXT"}</p></div></label>
            <div className="product-field" style={{marginTop:16}}><label>Resume text</label><textarea className="product-textarea" value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="Paste your resume text here..."/></div>
          </div>
          <div className="product-card">
            <div className="product-card-header"><div><h2>Target job description</h2><p>Optional, but recommended for keyword matching.</p></div></div>
            <textarea className="product-textarea" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} placeholder="Paste the job description here..."/>
            <div className="product-inline-actions" style={{marginTop:14}}><button className="product-button primary" disabled={loading || !resumeText.trim()} onClick={runCheck}><ScanSearch size={15}/>{loading ? "Checking..." : "Check ATS Score"}</button><button className="product-button" onClick={() => setJobDescription("React JavaScript Node.js REST APIs MongoDB Git SQL Python cloud scalable applications teamwork")}>Use sample job</button></div>
          </div>
        </section>

        <section className="product-card">
          {!result ? <div className="empty-product"><ScanSearch size={28}/><h2>Your ATS report will appear here</h2><p>Run a check to see your overall score, section scores, matched keywords and recommendations.</p></div> : <ATSResult result={result}/>} 
        </section>
      </div>
    </div>
  );
}

function ATSResult({result}) {
  return <>
    <div style={{textAlign:"center"}}><span className="product-eyebrow">ATS ANALYSIS</span><div className="product-score-ring" style={{"--score":`${result.score * 1}%`}}><span>{result.score}</span></div><h2 style={{margin:"0 0 5px",color:"#17344e"}}>ATS compatibility score</h2><p style={{margin:0,color:"#8394a5",fontSize:11}}>Demo analysis based on your resume and job description.</p></div>
    <div className="ats-score-grid">{Object.entries(result.sections).map(([key,value]) => <div className="ats-score-item" key={key}><strong>{value}</strong><span>{key}</span></div>)}</div>
    <section style={{marginTop:22}}><div className="product-card-header"><div><h3>Matched keywords</h3></div></div><div className="keyword-grid">{result.matchedKeywords.length ? result.matchedKeywords.map((word) => <span className="keyword-chip" key={word}><CheckCircle2 size={10} style={{verticalAlign:"-2px",marginRight:4}}/>{word}</span>) : <span style={{color:"#8999aa",fontSize:11}}>No matched keywords yet.</span>}</div></section>
    <section style={{marginTop:22}}><div className="product-card-header"><div><h3>Missing keywords</h3></div></div><div className="keyword-grid">{result.missingKeywords.length ? result.missingKeywords.map((word) => <span className="keyword-chip missing" key={word}><AlertCircle size={10} style={{verticalAlign:"-2px",marginRight:4}}/>{word}</span>) : <span style={{color:"#8999aa",fontSize:11}}>No obvious missing keywords.</span>}</div></section>
    <section style={{marginTop:22}}><div className="product-card-header"><div><h3><Sparkles size={15} style={{verticalAlign:"-2px",marginRight:5}}/>Recommendations</h3></div></div><ul style={{display:"grid",gap:9,paddingLeft:17,color:"#74889b",fontSize:11,lineHeight:1.55}}>{result.recommendations.map((item) => <li key={item}>{item}</li>)}</ul></section>
  </>;
}
