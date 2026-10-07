import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSearch,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { checkATSResume } from "../../services/mockApi";
import { uploadFile } from "../../utils/api";

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
  const [fileName, setFileName] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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
    if (!fileName || !resumeText.trim()) {
      setError("Upload a readable resume before running the ATS check.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      setResult(await checkATSResume({ resumeText, jobDescription }));
    } catch (checkError) {
      console.error("ATS check failed:", checkError);
      setError(checkError.message || "Could not analyze this resume.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-product">
      <header className="product-page-header">
        <div>
          <span className="product-eyebrow">BUILD & AI</span>
          <h1>ATS Resume Checker</h1>
          <p>Compare your uploaded resume with a job description and review keyword coverage and resume structure.</p>
        </div>
      </header>

      <div className="product-notice">
        <ScanSearch size={15} />
        <span>Analysis runs locally in your browser using the text extracted from your uploaded resume.</span>
      </div>

      {error && (
        <div className="product-notice" role="alert">
          <AlertCircle size={15} />
          <span>{error}</span>
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
            <label className="product-upload-zone" style={{ minHeight: 170 }}>
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
                <p>{uploading ? "Please wait while we read the file." : fileName ? "Resume uploaded and ready for analysis." : "PDF, DOCX or TXT · up to 10 MB"}</p>
              </div>
            </label>

            {resumeText && (
              <>
                <div className="product-field" style={{ marginTop: 16 }}>
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
                <div className="product-field" style={{ marginTop: 14 }}>
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
                <p>Optional, but recommended for job-specific keyword matching.</p>
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
            />
            <div className="product-inline-actions" style={{ marginTop: 14 }}>
              <button
                className="product-button primary"
                disabled={loading || uploading || !fileName || !resumeText.trim()}
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
            {!fileName && <p role="status">Upload a resume to enable ATS analysis.</p>}
          </div>
        </section>

        <section className="product-card">
          {!result ? (
            <div className="empty-product">
              <ScanSearch size={28} />
              <h2>Your ATS report will appear here</h2>
              <p>Upload a resume and run a check to see job keyword matches, resume structure and recommendations.</p>
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
  return (
    <>
      <div style={{ textAlign: "center" }}>
        <span className="product-eyebrow">ATS ANALYSIS</span>
        <div className="product-score-ring" style={{ "--score": `${result.score}%` }}>
          <span>{result.score}</span>
        </div>
        <h2 style={{ margin: "0 0 5px", color: "#17344e" }}>ATS compatibility score</h2>
        <p style={{ margin: 0, color: "#8394a5", fontSize: 11 }}>
          {result.hasJobDescription ? "Based on this resume and target job description." : "Based on resume structure and readable content. Add a job description for keyword matching."}
        </p>
      </div>

      <div className="ats-score-grid">
        {Object.entries(result.sections).map(([key, value]) => (
          <div className="ats-score-item" key={key}>
            <strong>{value}</strong><span>{key}</span>
          </div>
        ))}
      </div>

      {result.hasJobDescription && (
        <>
          <section style={{ marginTop: 22 }}>
            <div className="product-card-header"><div><h3>Matched job keywords</h3></div></div>
            <div className="keyword-grid">
              {result.matchedKeywords.length ? result.matchedKeywords.map((word) => (
                <span className="keyword-chip" key={word}><CheckCircle2 size={10} style={{ verticalAlign: "-2px", marginRight: 4 }} />{word}</span>
              )) : <span style={{ color: "#8999aa", fontSize: 11 }}>No job keywords matched yet.</span>}
            </div>
          </section>
          <section style={{ marginTop: 22 }}>
            <div className="product-card-header"><div><h3>Missing job keywords</h3></div></div>
            <div className="keyword-grid">
              {result.missingKeywords.length ? result.missingKeywords.map((word) => (
                <span className="keyword-chip missing" key={word}><AlertCircle size={10} style={{ verticalAlign: "-2px", marginRight: 4 }} />{word}</span>
              )) : <span style={{ color: "#8999aa", fontSize: 11 }}>No missing keywords found.</span>}
            </div>
          </section>
        </>
      )}

      <section style={{ marginTop: 22 }}>
        <div className="product-card-header"><div><h3><Sparkles size={15} style={{ verticalAlign: "-2px", marginRight: 5 }} />Recommendations</h3></div></div>
        <ul style={{ display: "grid", gap: 9, paddingLeft: 17, color: "#74889b", fontSize: 11, lineHeight: 1.55 }}>
          {result.recommendations.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
    </>
  );
}
