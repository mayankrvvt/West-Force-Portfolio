import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, FileCheck2, Lock, RotateCcw, Save, Wand2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageSkeleton, { SkeletonRows } from "../../components/dashboard/Skeleton";
import TailorDiff from "../../components/tailor/TailorDiff";
import { getApplications } from "../../services/applicationService";
import { getJob } from "../../services/jobService";
import { errorCode, getSavedResumes, saveTailoredResume, tailorResume } from "../../services/tailorService";
import FeaturePaused from "../../components/site/FeaturePaused";
import { useFeature } from "../../hooks/useSiteStatus";
import "../../styles/tailor.css";

const MAX_JOB_TEXT = 20000;

export default function TailorResume() {
  const navigate = useNavigate();
  const aiOn = useFeature("ai");
  const [params] = useSearchParams();
  const mountedRef = useRef(true);

  const [resumes, setResumes] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [needsPlan, setNeedsPlan] = useState(false);

  const [resumeId, setResumeId] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [jobId, setJobId] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobText, setJobText] = useState("");
  const [jobLoading, setJobLoading] = useState(false);
  const [jobNote, setJobNote] = useState("");

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null); // { message, retry }
  const [limitReached, setLimitReached] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [saveError, setSaveError] = useState("");

  const loadJob = async (id, fallback = {}) => {
    setJobLoading(true);
    setJobNote("");
    try {
      const job = await getJob(id);
      if (!mountedRef.current) return;
      setJobId(id);
      setJobTitle(job?.title || fallback.title || "");
      setCompany(job?.company || fallback.company || "");
      setJobText(job?.description || "");
      if (!job?.description) setJobNote("This job has no ad text saved. Paste the ad below.");
    } catch {
      if (mountedRef.current) setJobNote("Could not load the job ad. Paste it below instead.");
    } finally {
      if (mountedRef.current) setJobLoading(false);
    }
  };

  const pickApplication = (id, list = applications) => {
    setApplicationId(id);
    setJobNote("");
    if (!id) {
      setJobId("");
      return;
    }
    const application = list.find((item) => item._id === id);
    if (!application) return;
    setJobTitle(application.role || "");
    setCompany(application.company || "");
    if (application.jobId) {
      loadJob(String(application.jobId), { title: application.role, company: application.company });
    } else {
      setJobId("");
      setJobText("");
      setJobNote("This saved job has no ad text. Paste the ad below.");
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    const wantedResume = params.get("resumeId") || "";
    const wantedJob = params.get("jobId") || "";
    const wantedApplication = params.get("applicationId") || "";

    getSavedResumes()
      .then((items) => {
        if (!mountedRef.current) return;
        setResumes(items);
        const match = items.find((item) => item._id === wantedResume);
        setResumeId(match?._id || items[0]?._id || "");
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        if (err.status === 402) setNeedsPlan(true);
        else setLoadError(err.message || "Could not load your resumes.");
      })
      .finally(() => { if (mountedRef.current) setLoading(false); });

    // Saved jobs are a shortcut only, so a failure here is not shown.
    getApplications()
      .then((items) => {
        if (!mountedRef.current) return;
        setApplications(items);
        if (wantedApplication && items.some((item) => item._id === wantedApplication)) {
          pickApplication(wantedApplication, items);
        } else if (wantedJob) {
          const linked = items.find((item) => String(item.jobId || "") === wantedJob);
          if (linked) setApplicationId(linked._id);
        }
      })
      .catch(() => {});

    if (wantedJob && !wantedApplication) loadJob(wantedJob);

    return () => { mountedRef.current = false; };
    // Runs once: the query string only seeds the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trimmedText = jobText.trim();
  const canRun = Boolean(resumeId && trimmedText && jobTitle.trim()) && !running && !jobLoading && !limitReached && aiOn;

  const run = async (event) => {
    event?.preventDefault();
    if (!canRun) return;
    setRunning(true);
    setError(null);
    setResult(null);
    setSaved(null);
    setSaveError("");
    try {
      const response = await tailorResume({
        resumeId,
        jobDescription: trimmedText,
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        jobId: jobId || undefined,
      });
      if (mountedRef.current) setResult(response);
    } catch (err) {
      if (!mountedRef.current) return;
      if (err.status === 429) {
        setLimitReached(true);
        setError({ message: err.message || "You have used all your tailoring runs for today." });
      } else if (err.status === 502 || errorCode(err) === "AI_BAD_RESPONSE") {
        setError({ message: err.message || "The AI sent back something we could not use.", retry: true });
      } else {
        setError({ message: err.message || "Could not tailor your resume. Please try again." });
      }
    } finally {
      if (mountedRef.current) setRunning(false);
    }
  };

  const save = async () => {
    if (!result?.tailored || saving || saved) return;
    setSaving(true);
    setSaveError("");
    try {
      const resume = await saveTailoredResume({
        sourceResumeId: result.original?._id || resumeId,
        tailored: result.tailored,
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        jobId: jobId || undefined,
      });
      if (mountedRef.current) setSaved(resume || { title: result.tailored.title });
    } catch (err) {
      if (mountedRef.current) setSaveError(err.message || "Could not save the new version. Please try again.");
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  if (loading) return <div className="dashboard-product"><PageSkeleton layout="form" label="Loading your resumes" /></div>;

  const header = <header className="product-page-header">
    <div>
      <h1>Tailor resume</h1>
      <p>Match a saved resume to one job ad. Only the wording changes. Your employers, dates and education stay exactly as they are.</p>
    </div>
  </header>;

  if (needsPlan) {
    return <div className="dashboard-product">
      {header}
      <div className="empty-product"><span className="empty-product-icon"><Lock size={22} aria-hidden="true"/></span><h2>Tailoring is a paid feature</h2><p>Upgrade your plan to save resumes and tailor them to each job.</p><button className="product-button primary" onClick={() => navigate("/pricing")}>See plans</button></div>
    </div>;
  }

  if (!resumes.length) {
    return <div className="dashboard-product">
      {header}
      {loadError && <div className="product-error" role="alert"><AlertCircle size={16} aria-hidden="true"/><span>{loadError}</span></div>}
      {!loadError && <div className="empty-product"><span className="empty-product-icon"><FileCheck2 size={22} aria-hidden="true"/></span><h2>Nothing here yet</h2><p>Create and save a resume first. Then you can tailor it to any job.</p><button className="product-button primary" onClick={() => navigate("/dashboard/resume-builder")}>Create a resume</button></div>}
    </div>;
  }

  return <div className="dashboard-product tailor-page">
    {header}

    <form className="product-card tailor-setup" onSubmit={run}>
      <div className="product-form-grid">
        <label className="product-field">
          <span>Resume</span>
          <select className="product-input" value={resumeId} onChange={(e) => { setResumeId(e.target.value); setResult(null); setSaved(null); }}>
            {resumes.map((resume) => <option key={resume._id} value={resume._id}>{resume.title}{resume.version > 1 ? ` (version ${resume.version})` : ""}</option>)}
          </select>
        </label>
        <label className="product-field">
          <span>Saved job</span>
          <select className="product-input" value={applicationId} onChange={(e) => pickApplication(e.target.value)} disabled={jobLoading}>
            <option value="">None, I will paste the ad</option>
            {applications.map((application) => <option key={application._id} value={application._id}>{application.role}{application.company ? `, ${application.company}` : ""}</option>)}
          </select>
        </label>
        <label className="product-field">
          <span>Job title</span>
          <input className="product-input" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} maxLength={200} placeholder="Personal support worker" required/>
        </label>
        <label className="product-field">
          <span>Company</span>
          <input className="product-input" value={company} onChange={(e) => setCompany(e.target.value)} maxLength={200} placeholder="Optional"/>
        </label>
        <label className="product-field full">
          <span>Job ad</span>
          {jobLoading
            ? <SkeletonRows count={2} label="Loading the job ad"/>
            : <textarea className="product-textarea tailor-job-text" value={jobText} onChange={(e) => setJobText(e.target.value)} maxLength={MAX_JOB_TEXT} rows={8} placeholder="Paste the full job ad here"/>}
          <span className="tailor-hint">{jobNote || `${trimmedText.length.toLocaleString("en-CA")} of 20,000 characters`}</span>
        </label>
      </div>
      <div className="product-form-actions">
        <button className="product-button primary" type="submit" disabled={!canRun}>
          <Wand2 size={16} aria-hidden="true"/> {running ? "Tailoring…" : result ? "Tailor again" : "Tailor resume"}
        </button>
        <FeaturePaused feature="ai" />
      </div>
    </form>

    {error && <div className="product-error tailor-error" role="alert">
      <AlertCircle size={16} aria-hidden="true"/>
      <span>{error.message}</span>
      {error.retry && <button type="button" className="product-button compact" onClick={() => run()} disabled={running}><RotateCcw size={14} aria-hidden="true"/> Try again</button>}
    </div>}

    {running && <section className="product-card"><SkeletonRows count={4} label="Tailoring your resume"/></section>}

    {result && !running && <section className="tailor-result" aria-live="polite">
      <div className="tailor-main product-card">
        <div className="product-card-header">
          <div>
            <h2>{result.tailored?.title || "Tailored resume"}</h2>
            <p>{countLabel(result.changes?.length || 0)}. Added words are highlighted.</p>
          </div>
        </div>
        <TailorDiff changes={result.changes} original={result.original}/>
      </div>

      <aside className="tailor-side">
        <section className="product-card tailor-keywords">
          <div className="tailor-keywords-head"><span className="tailor-dot added" aria-hidden="true"/><strong>Added keywords</strong><span className="application-count">{result.addedKeywords?.length || 0}</span></div>
          {result.addedKeywords?.length
            ? <ul className="tailor-chip-list">{result.addedKeywords.map((word) => <li className="tailor-chip" key={word}>{word}</li>)}</ul>
            : <p className="application-empty">Nothing here yet</p>}
        </section>
        <section className="product-card tailor-keywords">
          <div className="tailor-keywords-head"><span className="tailor-dot skipped" aria-hidden="true"/><strong>Skipped keywords</strong><span className="application-count">{result.skippedKeywords?.length || 0}</span></div>
          {result.skippedKeywords?.length
            ? <ul className="tailor-skipped-list">{result.skippedKeywords.map((item) => <li key={item.keyword}><strong>{item.keyword}</strong><span>{item.reason}</span></li>)}</ul>
            : <p className="application-empty">Nothing here yet</p>}
        </section>
      </aside>
    </section>}

    <div className="tailor-save-bar">
      {saved
        ? <p className="tailor-saved"><Check size={16} aria-hidden="true"/> Saved as “{saved.title}”. <Link className="product-link" to="/dashboard/resumes">Open My resumes</Link></p>
        : <p className="tailor-hint">Saving makes a new version. The resume you picked is not changed.</p>}
      {saveError && <span className="tailor-save-error" role="alert">{saveError}</span>}
      <button type="button" className="product-button primary" onClick={save} disabled={!result?.tailored || running || saving || Boolean(saved)}>
        <Save size={16} aria-hidden="true"/> {saving ? "Saving…" : saved ? "Saved" : "Save as new version"}
      </button>
    </div>
  </div>;
}

function countLabel(count) {
  if (!count) return "No changes";
  return count === 1 ? "1 change" : `${count} changes`;
}
