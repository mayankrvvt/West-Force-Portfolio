import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  FileSearch,
  ScanSearch,
} from "lucide-react";
import { apiRequest, uploadFile } from "../../utils/api";

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
  const savedResumeId = searchParams.get("resumeId") || "";
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [needsPlan, setNeedsPlan] = useState(false);

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
      const extracted = await uploadFile("/api/resumes/extract-text", file);
      const text = extracted?.resumeText?.trim();

      if (!text) {
        throw new Error("No readable text could be extracted from this resume.");
      }

      setResumeText(text);
      setFileName(extracted.fileName || file.name);
    } catch (uploadError) {
      console.error("ATS resume upload failed:", uploadError);
      setError(uploadError.message || "Could not upload or read this resume.");
    } finally {
      setUploading(false);
    }
  };

  const runCheck = async () => {
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
      const body = useSaved
        ? { resumeId: savedResumeId, jobDescription }
        : { resumeText, jobDescription };
      setResult(await apiRequest("/api/ats/check", { method: "POST", body: JSON.stringify(body) }));
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
        <ScanSearch size={15} />
        <span>Your resume and the job description are checked by AI on our server. Up to 20 checks per day.</span>
      </div>

      {error && (
        <div className="product-notice" role="alert">
          <AlertCircle size={15} />
          <span>{error}{needsPlan && <> <Link to="/pricing">See plans</Link></>}</span>
        </div>
      )}

      <div className="ats-layout">
        <section>
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
                <FileSearch size={27} />
                <h3>{uploading ? "Extracting resume text..." : fileName || "Upload resume"}</h3>
                <p>{uploading ? "Please wait while we read the file." : fileName ? "Resume uploaded and ready for analysis." : useSaved ? "Using your saved resume. Upload a file to check a different one." : "PDF, DOCX or TXT · up to 10 MB"}</p>
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
                    <p role="status">No recognized skills found. You can review or edit the extracted text above.</p>
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
            <textarea
              className="product-textarea"
              value={jobDescription}
              onChange={(event) => {
                setJobDescription(event.target.value);
                setResult(null);
              }}
              placeholder="Paste the job description here..."
              maxLength={20000}
            />
            <div className="product-inline-actions">
              <button
                className="product-button primary"
                disabled={loading || uploading || !hasResume || !jobDescription.trim()}
                onClick={runCheck}
              >
                <ScanSearch size={15} />
                {loading ? "Checking..." : "Check ATS Score"}
              </button>
              <button
                className="product-button"
                onClick={() => setJobDescription("React JavaScript Node.js REST APIs MongoDB Git SQL Python cloud scalable applications teamwork")}
              >
                Use sample job
              </button>
            </div>
            {!hasResume && <p role="status">Upload a resume to enable ATS analysis.</p>}
          </div>
        </section>

        <section className="product-card">
          {!result ? (
            <div className="empty-product">
              <ScanSearch size={28} />
              <h2>Your ATS report will appear here</h2>
              <p>Upload a resume, paste a job description and run a check to see keyword matches and suggestions.</p>
            </div>
          ) : (
            <ATSResult result={result} />
          )}
        </section>
      </div>
    </div>
  );
}

function ATSResult({ result }) {
  const matched = result.matchedKeywords || [];
  const missing = result.missingKeywords || [];
  const suggestions = result.suggestions || [];

  return (
    <>
      <div className="ats-score-summary">
        <div className="product-score-ring" style={{ "--score": `${result.score}%` }}>
          <span>{result.score}</span>
        </div>
        <h2>ATS match score</h2>
        <p>
          {result.summary || "Based on this resume and the target job description."}
        </p>
      </div>

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

      {suggestions.length > 0 && (
        <section className="ats-result-section">
          <div className="product-card-header"><div><h3>Suggestions</h3></div></div>
          <ul className="ats-suggestions">
            {suggestions.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      )}
    </>
  );
}
