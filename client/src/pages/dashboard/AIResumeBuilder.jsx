import { useEffect, useRef, useState } from "react";

import {
  ArrowRight,
  Check,
  FileText,
  Sparkles,
  UploadCloud,
  WandSparkles,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  apiRequest,
  uploadFile,
} from "../../utils/api";

import {
  buildResume,
  enhanceResume,
} from "../../services/resumeService";


export default function AIResumeBuilder() {
  const navigate = useNavigate();

  const fileInputRef =
    useRef(null);

  const [portfolio, setPortfolio] =
    useState(null);

  const [file, setFile] =
    useState(null);

  const [mode, setMode] =
    useState("choose");

  const [loading, setLoading] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =========================================================
     RESUME TARGETING
  ========================================================= */

  const [industry, setIndustry] =
    useState("Technology");

  const [targetRole, setTargetRole] =
    useState("");

  const [country] =
    useState("Canada");

  const [experienceLevel, setExperienceLevel] =
    useState("Entry Level");

  const [jobDescription, setJobDescription] =
    useState("");

  const [resumeStyle, setResumeStyle] =
    useState("Canadian Professional");

  /* =========================================================
     ENHANCEMENT OPTIONS
  ========================================================= */

  const [selected, setSelected] =
    useState([
      "summary",
      "experience",
      "keywords",
      "ats",
    ]);

  const [result, setResult] =
    useState(null);


  /* =========================================================
     LOAD PORTFOLIO
  ========================================================= */

  useEffect(() => {
    async function loadPortfolio() {
      try {
        const result =
          await apiRequest(
            "/api/portfolios/me"
          );

        setPortfolio(
          result?.portfolio ||
          result?.data ||
          result
        );
      } catch (err) {
        console.warn(
          "Portfolio could not be loaded:",
          err
        );
      }
    }

    loadPortfolio();
  }, []);


  /* =========================================================
     SELECT FILE
  ========================================================= */

  const handleFile = (event) => {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    setFile(selectedFile);
    setResult(null);
    setError("");
    setMode("enhance");
  };


  /* =========================================================
     TOGGLE ENHANCEMENT
  ========================================================= */

  const toggleOption = (id) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter(
            (item) =>
              item !== id
          )
        : [
            ...current,
            id,
          ]
    );
  };


  /* =========================================================
     BUILD RESUME
  ========================================================= */

  const handleBuild = async () => {
    if (!targetRole.trim()) {
      setError(
        "Please enter the job title you are applying for."
      );

      return;
    }

    try {
      setLoading(true);
      setError("");

      const result =
        await buildResume({
          portfolio,

          industry,

          targetRole:
            targetRole.trim(),

          country,

          experienceLevel,

          jobDescription:
            jobDescription.trim(),

          resumeStyle,
        });

      navigate(
        "/dashboard/resume-editor",
        {
          state: {
            resume:
              result.resume,
          },
        }
      );

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Unable to build your resume."
      );

    } finally {
      setLoading(false);
    }
  };


  /* =========================================================
     ENHANCE RESUME
  ========================================================= */

  const handleEnhance = async () => {
    if (!file) {
      setError(
        "Please upload a resume first."
      );

      return;
    }

    if (!selected.length) {
      setError(
        "Select at least one improvement."
      );

      return;
    }

    try {
      setLoading(true);
      setError("");

      let uploadedUrl = "";

      /* =====================================================
         CLOUDINARY UPLOAD
      ===================================================== */

      try {
        setUploading(true);

        const uploadResult =
          await uploadFile(
            "/api/uploads",
            file
          );

        uploadedUrl =
          uploadResult?.file?.url ||
          "";

      } catch (uploadError) {
        console.warn(
          "Cloudinary upload skipped:",
          uploadError
        );

      } finally {
        setUploading(false);
      }


      /* =====================================================
         RESUME ENHANCEMENT
      ===================================================== */

      const result =
        await enhanceResume({
          fileName:
            file.name,

          fileUrl:
            uploadedUrl,

          portfolio,

          industry,

          targetRole:
            targetRole.trim(),

          country,

          experienceLevel,

          jobDescription:
            jobDescription.trim(),

          resumeStyle,

          options:
            selected,
        });

      setResult(result);

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        "Unable to enhance your resume."
      );

    } finally {
      setLoading(false);
    }
  };


  /* =========================================================
     OPEN EDITOR
  ========================================================= */

  const editEnhancedResume = () => {
    if (!result) {
      return;
    }

    navigate(
      "/dashboard/resume-editor",
      {
        state: {
          resume:
            result.resume,
        },
      }
    );
  };


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="dashboard-product">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="product-page-header">

        <div>

          <span className="product-eyebrow">
            BUILD & AI
          </span>

          <h1>
            AI Resume Builder
          </h1>

          <p>
            Create a professional
            Canadian-style resume for
            any career or industry.
          </p>

        </div>

      </header>


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="product-error">
          {error}
        </div>
      )}


      {/* =====================================================
          CHOOSE MODE
      ===================================================== */}

      {mode === "choose" && (
        <>

          <div className="resume-builder-choice-grid">

            <button
              type="button"
              className="resume-mode-card"
              onClick={() =>
                setMode("build")
              }
            >

              <div className="resume-mode-icon">
                <Sparkles size={24} />
              </div>

              <div>

                <span className="resume-mode-label">
                  FROM YOUR PROFILE
                </span>

                <h2>
                  Build a Canadian Resume
                </h2>

                <p>
                  Create a targeted,
                  Canadian-style resume
                  using the information
                  already saved in your
                  WestForce profile.
                </p>

              </div>

              <ArrowRight size={20} />

            </button>


            <button
              type="button"
              className="resume-mode-card"
              onClick={() =>
                setMode("enhance")
              }
            >

              <div className="resume-mode-icon">
                <WandSparkles size={24} />
              </div>

              <div>

                <span className="resume-mode-label">
                  UPLOAD EXISTING RESUME
                </span>

                <h2>
                  Enhance My Resume
                </h2>

                <p>
                  Upload an existing
                  resume and improve
                  it for your target
                  Canadian job.
                </p>

              </div>

              <ArrowRight size={20} />

            </button>

          </div>


          <div className="product-notice">

            <Sparkles size={15} />

            <span>
              Your resume remains under
              your control. AI-generated
              content can be reviewed and
              edited before you download it.
            </span>

          </div>

        </>
      )}


      {/* =====================================================
          BUILD RESUME
      ===================================================== */}

      {mode === "build" && (
        <section className="resume-builder-layout">

          <div className="product-card">

            <div className="product-card-header">

              <div>

                <span className="resume-step">
                  STEP 1
                </span>

                <h2>
                  Target your Canadian resume
                </h2>

                <p>
                  Tell WestForce what type
                  of position you are applying
                  for. Your profile will be used
                  as the source of information.
                </p>

              </div>

            </div>


            <div className="resume-form-grid">

              {/* =================================================
                  INDUSTRY
              ================================================= */}

              <div className="product-field">

                <label>
                  Industry
                </label>

                <select
                  className="product-input"
                  value={industry}
                  onChange={(event) =>
                    setIndustry(
                      event.target.value
                    )
                  }
                >

                  <option value="Technology">
                    Technology
                  </option>

                  <option value="Business & Finance">
                    Business & Finance
                  </option>

                  <option value="Marketing & Communications">
                    Marketing & Communications
                  </option>

                  <option value="Sales">
                    Sales
                  </option>

                  <option value="Healthcare">
                    Healthcare
                  </option>

                  <option value="Education">
                    Education
                  </option>

                  <option value="Administration">
                    Administration
                  </option>

                  <option value="Customer Service">
                    Customer Service
                  </option>

                  <option value="Hospitality & Tourism">
                    Hospitality & Tourism
                  </option>

                  <option value="Engineering">
                    Engineering
                  </option>

                  <option value="Skilled Trades">
                    Skilled Trades
                  </option>

                  <option value="Construction">
                    Construction
                  </option>

                  <option value="Retail">
                    Retail
                  </option>

                  <option value="Human Resources">
                    Human Resources
                  </option>

                  <option value="Legal">
                    Legal
                  </option>

                  <option value="Transportation & Logistics">
                    Transportation & Logistics
                  </option>

                  <option value="Government & Public Sector">
                    Government & Public Sector
                  </option>

                  <option value="Non-Profit">
                    Non-Profit
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>

              </div>


              {/* =================================================
                  TARGET ROLE
              ================================================= */}

              <div className="product-field">

                <label>
                  Target job title
                </label>

                <input
                  type="text"
                  className="product-input"
                  value={targetRole}
                  onChange={(event) =>
                    setTargetRole(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Marketing Coordinator"
                />

              </div>


              {/* =================================================
                  EXPERIENCE
              ================================================= */}

              <div className="product-field">

                <label>
                  Experience level
                </label>

                <select
                  className="product-input"
                  value={experienceLevel}
                  onChange={(event) =>
                    setExperienceLevel(
                      event.target.value
                    )
                  }
                >

                  <option>
                    Student / Recent Graduate
                  </option>

                  <option>
                    Entry Level
                  </option>

                  <option>
                    1–3 Years
                  </option>

                  <option>
                    3–5 Years
                  </option>

                  <option>
                    5–10 Years
                  </option>

                  <option>
                    10+ Years
                  </option>

                  <option>
                    Career Change
                  </option>

                </select>

              </div>


              {/* =================================================
                  RESUME STYLE
              ================================================= */}

              <div className="product-field">

                <label>
                  Resume style
                </label>

                <select
                  className="product-input"
                  value={resumeStyle}
                  onChange={(event) =>
                    setResumeStyle(
                      event.target.value
                    )
                  }
                >

                  <option>
                    Canadian Professional
                  </option>

                  <option>
                    Canadian Modern
                  </option>

                  <option>
                    Canadian Minimal
                  </option>

                  <option>
                    Canadian Executive
                  </option>

                </select>

              </div>

            </div>


            {/* =================================================
                JOB DESCRIPTION
            ================================================= */}

            <div className="product-field">

              <label>
                Job description
                <span
                  style={{
                    marginLeft: 6,
                    fontWeight: 400,
                    opacity: 0.65,
                  }}
                >
                  Optional
                </span>
              </label>

              <textarea
                className="product-input"
                value={jobDescription}
                onChange={(event) =>
                  setJobDescription(
                    event.target.value
                  )
                }
                placeholder="Paste the Canadian job posting here. WestForce will use it to target your resume toward the position."
                rows={8}
                style={{
                  resize: "vertical",
                  minHeight: 160,
                }}
              />

              <small
                style={{
                  display: "block",
                  marginTop: 7,
                  color: "#6c7890",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                Adding the job description
                helps WestForce identify
                relevant skills, keywords
                and experience.
              </small>

            </div>


            {/* =================================================
                PROFILE SOURCE
            ================================================= */}

            <div className="resume-source-preview">

              <div className="resume-source-icon">
                <FileText size={20} />
              </div>

              <div>

                <strong>
                  WestForce Profile
                </strong>

                <span>
                  {portfolio?.profile?.name ||
                    "Your profile"}

                  {" · "}

                  {portfolio?.profile?.title ||
                    "Professional"}

                </span>

              </div>

              <Check size={18} />

            </div>


            {/* =================================================
                BUILD BUTTON
            ================================================= */}

            <button
              type="button"
              className="product-button primary"
              disabled={
                loading ||
                !portfolio ||
                !targetRole.trim()
              }
              onClick={handleBuild}
            >

              <Sparkles size={16} />

              {loading
                ? "Building Canadian Resume..."
                : "Build Canadian Resume"}

            </button>

          </div>


          {/* ===================================================
              AI PANEL
          =================================================== */}

          <div className="product-ai-panel">

            <div className="product-ai-badge">
              <Sparkles size={20} />
            </div>

            <h2>
              What WestForce will build
            </h2>

            <p>
              Your resume will be structured
              around your target position
              rather than assuming a technical
              career.
            </p>

            <ul className="ai-feature-list">

              <li>
                <Check size={14} />
                Canadian-style structure
              </li>

              <li>
                <Check size={14} />
                Targeted professional summary
              </li>

              <li>
                <Check size={14} />
                Relevant experience
              </li>

              <li>
                <Check size={14} />
                Job-specific keywords
              </li>

              <li>
                <Check size={14} />
                Education & certifications
              </li>

              <li>
                <Check size={14} />
                ATS-friendly formatting
              </li>

              <li>
                <Check size={14} />
                Dynamic sections
              </li>

            </ul>

            <div
              style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop:
                  "1px solid rgba(17,30,57,.1)",
              }}
            >

              <strong
                style={{
                  display: "block",
                  marginBottom: 7,
                  fontSize: 13,
                }}
              >
                Built for every career
              </strong>

              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                Technology, finance,
                healthcare, education,
                administration, trades,
                hospitality, sales and more.
              </p>

            </div>

          </div>

        </section>
      )}


      {/* =====================================================
          ENHANCE RESUME
      ===================================================== */}

      {mode === "enhance" && (
        <section className="resume-builder-layout">

          <div className="product-card">

            <div className="product-card-header">

              <div>

                <span className="resume-step">
                  STEP 1
                </span>

                <h2>
                  Upload your resume
                </h2>

                <p>
                  Upload your existing resume
                  and choose what you want
                  WestForce to improve.
                </p>

              </div>

            </div>


            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFile}
              hidden
            />


            <button
              type="button"
              className="product-upload-zone"
              onClick={() =>
                fileInputRef.current?.click()
              }
            >

              <UploadCloud size={32} />

              <h3>
                {file
                  ? file.name
                  : "Upload your existing resume"}
              </h3>

              <p>
                {file
                  ? "Click to choose another file."
                  : "PDF, DOC or DOCX"}
              </p>

            </button>


            {file && (
              <div className="product-file-chip">

                <FileText size={20} />

                <div>

                  <strong>
                    {file.name}
                  </strong>

                  <span>
                    {Math.ceil(
                      file.size / 1024
                    )}{" "}
                    KB
                  </span>

                </div>

              </div>
            )}


            {/* =================================================
                TARGETING FOR ENHANCEMENT
            ================================================= */}

            <div
              className="product-card-header resume-improvement-heading"
              style={{
                marginTop: 25,
              }}
            >

              <div>

                <span className="resume-step">
                  STEP 2
                </span>

                <h2>
                  Target your resume
                </h2>

                <p>
                  Tell us what position this
                  resume is for so improvements
                  can be relevant to the job.
                </p>

              </div>

            </div>


            <div className="resume-form-grid">

              <div className="product-field">

                <label>
                  Industry
                </label>

                <select
                  className="product-input"
                  value={industry}
                  onChange={(event) =>
                    setIndustry(
                      event.target.value
                    )
                  }
                >

                  <option>
                    Technology
                  </option>

                  <option>
                    Business & Finance
                  </option>

                  <option>
                    Marketing & Communications
                  </option>

                  <option>
                    Sales
                  </option>

                  <option>
                    Healthcare
                  </option>

                  <option>
                    Education
                  </option>

                  <option>
                    Administration
                  </option>

                  <option>
                    Customer Service
                  </option>

                  <option>
                    Hospitality & Tourism
                  </option>

                  <option>
                    Engineering
                  </option>

                  <option>
                    Skilled Trades
                  </option>

                  <option>
                    Construction
                  </option>

                  <option>
                    Retail
                  </option>

                  <option>
                    Human Resources
                  </option>

                  <option>
                    Legal
                  </option>

                  <option>
                    Transportation & Logistics
                  </option>

                  <option>
                    Government & Public Sector
                  </option>

                  <option>
                    Other
                  </option>

                </select>

              </div>


              <div className="product-field">

                <label>
                  Target job title
                </label>

                <input
                  type="text"
                  className="product-input"
                  value={targetRole}
                  onChange={(event) =>
                    setTargetRole(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Administrative Assistant"
                />

              </div>

            </div>


            <div className="product-field">

              <label>
                Job description
                <span
                  style={{
                    marginLeft: 6,
                    fontWeight: 400,
                    opacity: 0.65,
                  }}
                >
                  Optional
                </span>
              </label>

              <textarea
                className="product-input"
                value={jobDescription}
                onChange={(event) =>
                  setJobDescription(
                    event.target.value
                  )
                }
                placeholder="Paste the job description to make the enhancement more targeted."
                rows={6}
                style={{
                  resize: "vertical",
                }}
              />

            </div>


            {/* =================================================
                IMPROVEMENTS
            ================================================= */}

            <div className="product-card-header resume-improvement-heading">

              <div>

                <span className="resume-step">
                  STEP 3
                </span>

                <h2>
                  Choose improvements
                </h2>

              </div>

            </div>


            <div className="product-option-list">

              <ImprovementOption
                id="summary"
                title="Professional Summary"
                description="Make your opening profile clearer and targeted to the role."
                selected={selected}
                toggle={toggleOption}
              />

              <ImprovementOption
                id="experience"
                title="Experience"
                description="Turn responsibilities into stronger achievement-focused statements."
                selected={selected}
                toggle={toggleOption}
              />

              <ImprovementOption
                id="keywords"
                title="Keywords & Skills"
                description="Improve terminology and prioritize skills relevant to the target position."
                selected={selected}
                toggle={toggleOption}
              />

              <ImprovementOption
                id="ats"
                title="ATS Compatibility"
                description="Improve structure and readability for applicant tracking systems."
                selected={selected}
                toggle={toggleOption}
              />

              <ImprovementOption
                id="projects"
                title="Projects & Achievements"
                description="Strengthen relevant projects, accomplishments and practical experience."
                selected={selected}
                toggle={toggleOption}
              />

              <ImprovementOption
                id="rewrite"
                title="Full Resume Rewrite"
                description="Apply recommended improvements across the entire resume."
                selected={selected}
                toggle={toggleOption}
              />

            </div>


            <button
              type="button"
              className="product-button primary"
              disabled={
                loading ||
                !file ||
                !selected.length
              }
              onClick={handleEnhance}
            >

              <WandSparkles size={16} />

              {uploading
                ? "Uploading..."
                : loading
                ? "Enhancing..."
                : "Enhance Resume with AI"}

            </button>


            {result && (
              <button
                type="button"
                className="product-button"
                style={{
                  marginTop: 10,
                }}
                onClick={
                  editEnhancedResume
                }
              >
                Open Editable Resume
                <ArrowRight size={15} />
              </button>
            )}

          </div>


          {/* ===================================================
              ENHANCEMENT PANEL
          =================================================== */}

          <div className="product-ai-panel">

            <div className="product-ai-badge">
              <WandSparkles size={20} />
            </div>

            <h2>
              Canadian Resume Enhancement
            </h2>

            {!result ? (
              <>

                <p>
                  WestForce can improve your
                  resume for a specific Canadian
                  position while keeping you in
                  control of the final content.
                </p>

                <ul className="ai-feature-list">

                  <li>
                    <Check size={14} />
                    Canadian resume structure
                  </li>

                  <li>
                    <Check size={14} />
                    Role-specific wording
                  </li>

                  <li>
                    <Check size={14} />
                    Relevant keywords
                  </li>

                  <li>
                    <Check size={14} />
                    Achievement-focused experience
                  </li>

                  <li>
                    <Check size={14} />
                    ATS-friendly formatting
                  </li>

                  <li>
                    <Check size={14} />
                    Edit every section
                  </li>

                </ul>

              </>
            ) : (
              <EnhancementResult
                result={result}
                onEdit={
                  editEnhancedResume
                }
              />
            )}

          </div>

        </section>
      )}

    </div>
  );
}


/* =========================================================
   IMPROVEMENT OPTION
========================================================= */

function ImprovementOption({
  id,
  title,
  description,
  selected,
  toggle,
}) {
  return (
    <label className="product-checkbox">

      <input
        type="checkbox"
        checked={
          selected.includes(id)
        }
        onChange={() =>
          toggle(id)
        }
      />

      <span>

        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>

      </span>

    </label>
  );
}


/* =========================================================
   RESULT
========================================================= */

function EnhancementResult({
  result,
  onEdit,
}) {
  return (
    <div className="resume-enhancement-result">

      <span className="resume-mode-label">
        ENHANCEMENT COMPLETE
      </span>

      <div className="resume-score-comparison">

        <div>

          <small>
            BEFORE
          </small>

          <strong>
            {result.scoreBefore}
          </strong>

        </div>

        <span>
          →
        </span>

        <div>

          <small>
            AFTER
          </small>

          <strong>
            {result.scoreAfter}
          </strong>

        </div>

      </div>

      <p>
        {result.summary}
      </p>

      <ul className="ai-feature-list">

        {(result.improvements || [])
          .map((item) => (
            <li key={item}>
              <Check size={14} />
              {item}
            </li>
          ))}

      </ul>

      <button
        type="button"
        className="product-button primary"
        onClick={onEdit}
      >
        Open Editable Resume
        <ArrowRight size={15} />
      </button>

    </div>
  );
}