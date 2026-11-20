import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  FileSearch,
  Lightbulb,
  ScanSearch,
} from "lucide-react";
import AtsHistory from "../../components/ats/AtsHistory";
import ScoreBreakdown from "../../components/ats/ScoreBreakdown";
import { extractResumeText, getAtsHistory, runAtsCheck } from "../../services/atsService";
import FeaturePaused from "../../components/site/FeaturePaused";
import { useFeature } from "../../hooks/useSiteStatus";
import "../../styles/ats.css";

/** A friendly message for each ATS error the server can send. */
function atsErrorMessage(error) {
  if (error?.status === 402) return "The ATS checker is part of the paid plans.";
  if (error?.status === 429) return error.message || "You have used all ATS checks for today. Please try again tomorrow.";
  if (error?.status === 504) return "The check took too long. Please try again.";
  return error?.message || "Could not analyze this resume.";
}

const SKILL_TERMS = [
  "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go",
  "Ruby", "PHP", "Swift", "Kotlin", "React", "Angular", "Vue",
  "Node.js", "Express", "Next.js", "HTML", "CSS", "Tailwind CSS",
  "REST API", "GraphQL", "SQL", "PostgreSQL", "MySQL", "MongoDB",
  "Redis", "Firebase", "AWS", "Azure", "Google Cloud", "Docker",
  "Kubernetes", "Git", "CI/CD", "Linux", " machine learning",
  "data analysis", "Tableau", "Power BI", "Excel", "project management",
  "Agile", "Scrum", "Figma", "communication", "leadership",
];

function findSkills(text) {
  const normalizedText = text.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ");

  return SKILL_TERMS
    .map((skill) => skill.trim())
    .filter((skill) => {
      const normalizedSkill = skill.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ");
      return new RegExp(`(^| )${normalizedSkill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}( |$)`, "i")
        .test(normalizedText);
    });
}

export default function ATSChecker() {
  const [searchParams] = useSearchParams();
  const aiOn = useFeature("ai");
  const savedResumeId = searchParams.get("resumeId") || "";
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [needsPlan, setNeedsPlan] = useState(false);
  const [history, setHistory] = useState({ checks: [], loading: true, error: "", hidden: false });

  const loadHistory = useCallback(async () => {
    try {
      const checks = await getAtsHistory();
      setHistory({ checks, loading: false, error: "", hidden: false });
    } catch (historyError) {
      // Free plans cannot use the checker, so there is no history to show.
      const hidden = historyError?.status === 402;
      setHistory({ checks: [], loading: false, error: "Could not load your past checks.", hidden });
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // An uploaded resume wins; otherwise a saved resume opened from My Resumes.
  const useSaved = !resumeText.trim() && Boolean(savedResumeId);
  const hasResume = Boolean(resumeText.trim()) || useSaved;

  const skills = findSkills(resumeText);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setResult(null);
    setResumeText("");
    setFileName("");
    setUploading(true);

    try {
      const extracted = await extractResumeText(file);

      if (!extracted.resumeText) {
        throw new Error("No readable text could be extracted from this resume.");
      }

      setResumeText(extracted.resumeText);
      setFileName(extracted.fileName);
    } catch (uploadError) {
      console.error("ATS resume upload failed:", uploadError);
      setError(uploadError.message || "Could not upload or read this resume.");
    } finally {
      setUploading(false);
    }
  };

  const runCheck = async () => {
    if (!aiOn) return;
    if (!hasResume) {
      setError("Upload a readable resume before running the ATS check.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Paste the job description to compare your resume with.");
      return;
    }

    setError("");
    setNeedsPlan(false);
    setLoading(true);
    try {
      const source = useSaved ? { resumeId: savedResumeId } : { resumeText };
      setResult(await runAtsCheck({ ...source, jobDescription, jobTitle }));
      loadHistory();
    } catch (checkError) {
      console.error("ATS check failed:", checkError?.status);
      if (checkError?.status === 402) setNeedsPlan(true);
      setError(atsErrorMessage(checkError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-product">
      <header className="product-page-header">
        <div>
          <h1>ATS resume checker</h1>
          <p>Compare your resume with a job description and see which keywords and sections are missing.</p>
        </div>
      </header>

      <div className="product-notice">
        <ScanSearch size={16} aria-hidden="true" />
        <span>Your score comes from clear rules you can see below. AI only adds advice. Up to 20 checks per day.</span>
      </div>

      {error && (
        <div className="product-error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}{needsPlan && <> <Link to="/pricing">See plans</Link></>}</span>
        </div>
      )}

      <div className="ats-layout">
        <section className="ats-inputs">
          <div className="product-card">
            <div className="product-card-header">
              <div>
                <h2>Resume</h2>
                <p>Upload a PDF, DOCX or plain-text resume before checking.</p>
              </div>
            </div>
            <label className="product-upload-zone">
              <input
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={handleFile}
                disabled={uploading || loading}
                hidden
              />
              <div>
                <span className="product-upload-icon"><FileSearch size={20} aria-hidden="true" /></span>
                <h3>{uploading ? "Reading your resume…" : fileName || "Upload resume"}</h3>
                <p>{uploading ? "Please wait while we read the file." : fileName ? "Resume uploaded and ready for analysis." : useSaved ? "Using your saved resume. Upload a file to check a different one." : "PDF, DOCX or TXT, up to 10 MB"}</p>
              </div>
            </label>

            {resumeText && (
              <>
                <div className="product-field">
                  <label htmlFor="ats-resume-text">Extracted resume text</label>
                  <textarea
                    id="ats-resume-text"
                    className="product-textarea"
                    value={resumeText}
                    onChange={(event) => {
                      setResumeText(event.target.value);
                      setResult(null);
                    }}
                  />
                </div>
                <div className="product-field">
                  <label>Skills found in the extracted text</label>
                  {skills.length ? (
                    <div className="keyword-grid">
                      {skills.map((skill) => (
                        <span className="keyword-chip" key={skill}>{skill}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="field-hint" role="status">No skills found yet. You can review or edit the text above.</p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="product-card">
            <div className="product-card-header">
              <div>
                <h2>Target job description</h2>
                <p>Paste the job you are applying for.</p>
              </div>
            </div>
            <div className="product-field ats-job-title">
              <label htmlFor="ats-job-title">Job title (optional)</label>
              <input
                id="ats-job-title"
                className="product-input"
                value={jobTitle}
                maxLength={200}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="Personal support worker"
              />
            </div>
            <label className="sr-only" htmlFor="ats-job-description">Job description</label>
            <textarea
              id="ats-job-description"
              className="product-textarea"
              value={jobDescription}
              onChange={(event) => {
                setJobDescription(event.target.value);
                setResult(null);
              }}
              placeholder="Paste the job description here"
              maxLength={20000}
            />
            <div className="product-inline-actions">
              <button
                className="product-button primary"
                disabled={loading || uploading || !hasResume || !jobDescription.trim() || !aiOn}
                onClick={runCheck}
              >
                <ScanSearch size={16} aria-hidden="true" />
                {loading ? "Checking…" : "Check ATS score"}
              </button>
              <button
                className="product-button"
                onClick={() => setJobDescription("React JavaScript Node.js REST APIs MongoDB Git SQL Python cloud scalable applications teamwork")}
              >
                Use sample job
              </button>
            </div>
            <FeaturePaused feature="ai" />
            {!hasResume && <p className="field-hint" role="status">Upload a resume first, then run the check.</p>}
          </div>
        </section>

        <section className="product-card ats-report">
          {!result ? (
            <div className="empty-product">
              <span className="empty-product-icon"><ScanSearch size={22} aria-hidden="true" /></span>
              <h2>Your ATS report will appear here</h2>
              <p>Three steps to your score:</p>
              <ol className="ats-steps">
                <li className={hasResume ? "done" : ""}>Upload your resume</li>
                <li className={jobDescription.trim() ? "done" : ""}>Paste the job description</li>
                <li>Select Check ATS score</li>
              </ol>
            </div>
          ) : (
            <ATSResult result={result} />
          )}
        </section>
      </div>

      {!history.hidden && (
        <AtsHistory checks={history.checks} loading={history.loading} error={history.error} />
      )}
    </div>
  );
}

function ATSResult({ result }) {
  const matched = result.keywords?.matched || result.matchedKeywords || [];
  const missing = result.keywords?.missing || result.missingKeywords || [];
  const advice = result.advice;

  return (
    <>
      <h2 className="ats-report-title">ATS match score</h2>
      <ScoreBreakdown score={result.score} breakdown={result.breakdown || []} />

      <section className="ats-result-section">
        <div className="product-card-header"><div><h3>Matched job keywords</h3></div></div>
        <div className="keyword-grid">
          {matched.length ? matched.map((word) => (
            <span className="keyword-chip" key={word}><CheckCircle2 size={12} aria-hidden="true" />{word}</span>
          )) : <span className="ats-empty">No job keywords matched yet.</span>}
        </div>
      </section>
      <section className="ats-result-section">
        <div className="product-card-header"><div><h3>Missing job keywords</h3></div></div>
        <div className="keyword-grid">
          {missing.length ? missing.map((word) => (
            <span className="keyword-chip missing" key={word}><AlertCircle size={12} aria-hidden="true" />{word}</span>
          )) : <span className="ats-empty">No missing keywords found.</span>}
        </div>
      </section>

      {advice && (advice.summary || advice.suggestions?.length > 0) && (
        <section className="ats-result-section ats-advice">
          <div className="product-card-header">
            <div>
              <h3><Lightbulb size={16} aria-hidden="true" /> Advice for this job</h3>
              <p>Written by AI. It does not change your score.</p>
            </div>
          </div>
          {advice.summary && <p className="ats-advice-summary">{advice.summary}</p>}
          {advice.suggestions?.length > 0 && (
            <ul className="ats-suggestions">
              {advice.suggestions.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
