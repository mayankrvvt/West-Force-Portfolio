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
  waitForAuthUser,
} from "../../utils/api";

import {
  buildResume,
  enhanceResume,
} from "../../services/resumeService";

export default function AIResumeBuilder() {
  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  // =====================================================
  // STATE
  // =====================================================

  const [portfolio, setPortfolio] = useState(null);

  const [file, setFile] = useState(null);

  const [mode, setMode] = useState("choose");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [targetRole, setTargetRole] =
    useState("Software Engineer");

  const [country, setCountry] =
    useState("Canada");

  const [experienceLevel, setExperienceLevel] =
    useState("Entry Level");

  const [selected, setSelected] = useState([
    "summary",
    "experience",
    "keywords",
    "ats",
  ]);

  const [result, setResult] = useState(null);

  // =====================================================
  // LOAD USER PORTFOLIO
  // =====================================================

  useEffect(() => {
    let cancelled = false;

    async function loadPortfolio() {
      try {
        setError("");

        // Wait until Firebase finishes restoring the user's session.
        const user = await waitForAuthUser();

        if (!user) {
          throw new Error(
            "You must be signed in to use the AI Resume Builder."
          );
        }

        console.log(
          "Firebase user authenticated:",
          user.uid
        );

        // Now request the portfolio with the authenticated token.
        const response = await apiRequest(
          "/api/portfolios/me"
        );

        if (cancelled) return;

        const portfolioData =
          response?.portfolio ||
          response?.data ||
          response;

        if (!portfolioData) {
          throw new Error(
            "No portfolio was found for your account."
          );
        }

        console.log(
          "Portfolio loaded successfully:",
          portfolioData
        );

        setPortfolio(portfolioData);
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Failed to load portfolio:",
          err
        );

        setError(
          err?.message ||
            "Your portfolio could not be loaded."
        );
      }
    }

    loadPortfolio();

    return () => {
      cancelled = true;
    };
  }, []);

  // =====================================================
  // SELECT RESUME FILE
  // =====================================================

  const handleFile = (event) => {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    // ---------------------------------------------------
    // Validate file type
    // ---------------------------------------------------

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (
      !allowedTypes.includes(
        selectedFile.type
      )
    ) {
      setError(
        "Please upload a PDF, DOC or DOCX resume."
      );

      event.target.value = "";

      return;
    }

    // ---------------------------------------------------
    // Validate file size
    // ---------------------------------------------------

    const maxSize =
      10 * 1024 * 1024;

    if (selectedFile.size > maxSize) {
      setError(
        "Resume file must be smaller than 10 MB."
      );

      event.target.value = "";

      return;
    }

    // ---------------------------------------------------
    // Save actual File object
    // ---------------------------------------------------

    setFile(selectedFile);

    setResult(null);

    setError("");

    setMode("enhance");
  };

  // =====================================================
  // TOGGLE ENHANCEMENT OPTION
  // =====================================================

  const toggleOption = (id) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter(
            (item) => item !== id
          )
        : [...current, id]
    );
  };

  // =====================================================
  // BUILD NEW RESUME FROM PROFILE
  // =====================================================

  const handleBuild = async () => {
    if (!portfolio) {
      setError(
        "Your portfolio information is still loading. Please try again."
      );

      return;
    }

    try {
      setLoading(true);

      setError("");

      setResult(null);

      console.log(
        "Starting AI Resume Builder..."
      );

      const response =
        await buildResume({
          portfolio,

          targetRole,

          country,

          experienceLevel,
        });

      console.log(
        "AI Resume Builder response:",
        response
      );

      if (!response?.resume) {
        throw new Error(
          "Gemini did not return a resume."
        );
      }

      navigate(
        "/dashboard/resume-editor",
        {
          state: {
            resume:
              response.resume,
          },
        }
      );
    } catch (err) {
      console.error(
        "AI Resume Builder error:",
        err
      );

      setError(
        err.message ||
          "Unable to build your resume."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // ENHANCE EXISTING RESUME
  // =====================================================

  const handleEnhance = async () => {
    // ---------------------------------------------------
    // Make sure a file exists
    // ---------------------------------------------------

    if (!file) {
      setError(
        "Please upload a resume first."
      );

      return;
    }

    // ---------------------------------------------------
    // Make sure at least one option is selected
    // ---------------------------------------------------

    if (!selected.length) {
      setError(
        "Select at least one improvement."
      );

      return;
    }

    try {
      setLoading(true);

      setError("");

      setResult(null);

      console.log(
        "Starting AI Resume Enhancement..."
      );

      console.log(
        "Resume file:",
        file.name
      );

      // -------------------------------------------------
      // IMPORTANT:
      //
      // Send the ACTUAL File object.
      //
      // Do NOT upload to Cloudinary first.
      // The backend's /api/resumes/enhance endpoint
      // uses Multer memoryStorage and sends the file
      // to the resume text extractor.
      // -------------------------------------------------

      const response =
        await enhanceResume({
          file,

          portfolio,

          options: selected,

          targetRole,

          country,
        });

      console.log(
        "AI Resume Enhancement response:",
        response
      );

      if (!response?.resume) {
        throw new Error(
          "Gemini did not return an enhanced resume."
        );
      }

      setResult(response);
    } catch (err) {
      console.error(
        "AI Resume Enhancement error:",
        err
      );

      setError(
        err.message ||
          "Unable to enhance your resume."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // OPEN GENERATED / ENHANCED RESUME
  // =====================================================

  const editResume = () => {
    if (!result?.resume) {
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

  // =====================================================
  // GO TO BUILD MODE
  // =====================================================

  const openBuildMode = () => {
    setMode("build");

    setError("");

    setResult(null);
  };

  // =====================================================
  // GO TO ENHANCE MODE
  // =====================================================

  const openEnhanceMode = () => {
    setMode("enhance");

    setError("");

    setResult(null);
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="dashboard-product">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <header className="product-page-header">

        <div>

          <span className="product-eyebrow">
            BUILD & AI
          </span>

          <h1>
            AI Resume Builder
          </h1>

          <p>
            Build a new resume from your
            WestForce profile or enhance an
            existing resume with AI.
          </p>

        </div>

      </header>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="product-error">
          {error}
        </div>
      )}

      {/* =================================================
          CHOOSE MODE
      ================================================= */}

      {mode === "choose" && (
        <>

          <div className="resume-builder-choice-grid">

            {/* ===========================================
                BUILD FROM PROFILE
            =========================================== */}

            <button
              type="button"
              className="resume-mode-card"
              onClick={
                openBuildMode
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
                  Build a Resume
                </h2>

                <p>
                  Generate a professional
                  resume using the information
                  already saved in your
                  WestForce portfolio.
                </p>

              </div>

              <ArrowRight size={20} />

            </button>

            {/* ===========================================
                ENHANCE EXISTING RESUME
            =========================================== */}

            <button
              type="button"
              className="resume-mode-card"
              onClick={
                openEnhanceMode
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
                  Upload an existing resume
                  and choose which sections
                  you want AI to improve.
                </p>

              </div>

              <ArrowRight size={20} />

            </button>

          </div>

          <div className="product-notice">

            <Sparkles size={15} />

            <span>
              Your resume content remains
              under your control. AI suggestions
              can be reviewed and edited before
              you download the final version.
            </span>

          </div>

        </>
      )}

      {/* =================================================
          BUILD MODE
      ================================================= */}

      {mode === "build" && (
        <section className="resume-builder-layout">

          <div className="product-card">

            {/* ===========================================
                HEADER
            =========================================== */}

            <div className="product-card-header">

              <div>

                <span className="resume-step">
                  STEP 1
                </span>

                <h2>
                  Tell us about the resume
                </h2>

                <p>
                  Your existing WestForce
                  profile will be used as the
                  source of information.
                </p>

              </div>

            </div>

            {/* ===========================================
                FORM
            =========================================== */}

            <div className="resume-form-grid">

              {/* TARGET ROLE */}

              <div className="product-field">

                <label>
                  Target role
                </label>

                <select
                  className="product-input"
                  value={targetRole}
                  onChange={(event) =>
                    setTargetRole(
                      event.target.value
                    )
                  }
                >

                  <option>
                    Software Engineer
                  </option>

                  <option>
                    Full Stack Developer
                  </option>

                  <option>
                    Frontend Developer
                  </option>

                  <option>
                    Backend Developer
                  </option>

                  <option>
                    Java Developer
                  </option>

                  <option>
                    C++ Developer
                  </option>

                  <option>
                    Data Analyst
                  </option>

                  <option>
                    Custom
                  </option>

                </select>

              </div>

              {/* COUNTRY */}

              <div className="product-field">

                <label>
                  Country
                </label>

                <select
                  className="product-input"
                  value={country}
                  onChange={(event) =>
                    setCountry(
                      event.target.value
                    )
                  }
                >

                  <option>
                    Canada
                  </option>

                  <option>
                    United States
                  </option>

                  <option>
                    United Kingdom
                  </option>

                  <option>
                    India
                  </option>

                </select>

              </div>

              {/* EXPERIENCE */}

              <div className="product-field">

                <label>
                  Experience level
                </label>

                <select
                  className="product-input"
                  value={
                    experienceLevel
                  }
                  onChange={(event) =>
                    setExperienceLevel(
                      event.target.value
                    )
                  }
                >

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
                    5+ Years
                  </option>

                </select>

              </div>

            </div>

            {/* ===========================================
                PROFILE SOURCE
            =========================================== */}

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
                    portfolio?.personalDetails
                      ?.fullName ||
                    "Your profile"}

                  {" · "}

                  {portfolio?.profile?.title ||
                    portfolio?.personalDetails
                      ?.headline ||
                    "Professional"}
                </span>

              </div>

              <Check size={18} />

            </div>

            {/* ===========================================
                BUILD BUTTON
            =========================================== */}

            <button
              type="button"
              className="product-button primary"
              disabled={
                loading ||
                !portfolio
              }
              onClick={
                handleBuild
              }
            >

              <Sparkles size={16} />

              {loading
                ? "Building Resume..."
                : "Build Resume with AI"}

            </button>

          </div>

          {/* =============================================
              AI PANEL
          ============================================= */}

          <div className="product-ai-panel">

            <div className="product-ai-badge">
              <Sparkles size={20} />
            </div>

            <h2>
              What AI will build
            </h2>

            <p>
              WestForce will organize your
              existing profile into a clean,
              editable Canadian-market resume.
            </p>

            <ul className="ai-feature-list">

              <li>
                <Check size={14} />
                Professional summary
              </li>

              <li>
                <Check size={14} />
                Experience achievements
              </li>

              <li>
                <Check size={14} />
                Education
              </li>

              <li>
                <Check size={14} />
                Technical skills
              </li>

              <li>
                <Check size={14} />
                Projects
              </li>

              <li>
                <Check size={14} />
                Certifications
              </li>

              <li>
                <Check size={14} />
                ATS-friendly structure
              </li>

            </ul>

          </div>

        </section>
      )}

      {/* =================================================
          ENHANCE MODE
      ================================================= */}

      {mode === "enhance" && (
        <section className="resume-builder-layout">

          <div className="product-card">

            {/* ===========================================
                HEADER
            =========================================== */}

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
                  and choose what you want AI
                  to improve.
                </p>

              </div>

            </div>

            {/* ===========================================
                FILE INPUT
            =========================================== */}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={
                handleFile
              }
              hidden
            />

            {/* ===========================================
                UPLOAD ZONE
            =========================================== */}

            <button
              type="button"
              className="product-upload-zone"
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={loading}
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

            {/* ===========================================
                SELECTED FILE
            =========================================== */}

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

            {/* ===========================================
                STEP 2
            =========================================== */}

            <div className="product-card-header resume-improvement-heading">

              <div>

                <span className="resume-step">
                  STEP 2
                </span>

                <h2>
                  Choose improvements
                </h2>

              </div>

            </div>

            {/* ===========================================
                IMPROVEMENT OPTIONS
            =========================================== */}

            <div className="product-option-list">

              <ImprovementOption
                id="summary"
                title="Professional Summary"
                description="Make your opening profile clearer and more targeted."
                selected={selected}
                toggle={toggleOption}
              />

              <ImprovementOption
                id="experience"
                title="Experience"
                description="Turn responsibilities into stronger achievement-focused bullets."
                selected={selected}
                toggle={toggleOption}
              />

              <ImprovementOption
                id="keywords"
                title="Keywords & Skills"
                description="Improve terminology and organize relevant technical skills."
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
                title="Projects"
                description="Strengthen project descriptions and technical impact."
                selected={selected}
                toggle={toggleOption}
              />

              <ImprovementOption
                id="rewrite"
                title="Full Resume Rewrite"
                description="Apply all recommended improvements across the resume."
                selected={selected}
                toggle={toggleOption}
              />

            </div>

            {/* ===========================================
                ENHANCE BUTTON
            =========================================== */}

            <button
              type="button"
              className="product-button primary"
              disabled={
                loading ||
                !file ||
                !selected.length
              }
              onClick={
                handleEnhance
              }
            >

              <WandSparkles size={16} />

              {loading
                ? "Enhancing with AI..."
                : "Enhance Resume with AI"}

            </button>

            {/* ===========================================
                OPEN EDITOR
            =========================================== */}

            {result?.resume && (
              <button
                type="button"
                className="product-button"
                style={{
                  marginTop: 10,
                }}
                onClick={
                  editResume
                }
              >

                Open Editable Resume

                <ArrowRight size={15} />

              </button>
            )}

          </div>

          {/* =============================================
              AI PANEL
          ============================================= */}

          <div className="product-ai-panel">

            <div className="product-ai-badge">
              <WandSparkles size={20} />
            </div>

            <h2>
              AI Enhancement
            </h2>

            {!result ? (
              <>

                <p>
                  Upload your resume and
                  choose the areas you want
                  WestForce to improve.
                </p>

                <ul className="ai-feature-list">

                  <li>
                    <Check size={14} />
                    Review suggestions
                  </li>

                  <li>
                    <Check size={14} />
                    Edit every section
                  </li>

                  <li>
                    <Check size={14} />
                    Compare before and after
                  </li>

                  <li>
                    <Check size={14} />
                    Run ATS analysis
                  </li>

                  <li>
                    <Check size={14} />
                    Preserve your real experience
                  </li>

                </ul>

              </>
            ) : (

              <EnhancementResult
                result={result}
                onEdit={
                  editResume
                }
              />

            )}

          </div>

        </section>
      )}

    </div>
  );
}

// =======================================================
// IMPROVEMENT OPTION
// =======================================================

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

// =======================================================
// ENHANCEMENT RESULT
// =======================================================

function EnhancementResult({
  result,
  onEdit,
}) {
  const scoreBefore =
    result?.scoreBefore ??
    result?.atsAnalysis
      ?.scoreBefore ??
    "—";

  const scoreAfter =
    result?.scoreAfter ??
    result?.atsAnalysis
      ?.scoreAfter ??
    "—";

  const summary =
    result?.summary ||
    "Your resume has been enhanced using the selected improvements.";

  const improvements =
    result?.improvements ||
    result?.changes ||
    [];

  return (
    <div className="resume-enhancement-result">

      <span className="resume-mode-label">
        ENHANCEMENT COMPLETE
      </span>

      {/* =============================================
          SCORE COMPARISON
      ============================================= */}

      <div className="resume-score-comparison">

        <div>

          <small>
            BEFORE
          </small>

          <strong>
            {scoreBefore}
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
            {scoreAfter}
          </strong>

        </div>

      </div>

      {/* =============================================
          SUMMARY
      ============================================= */}

      <p>
        {summary}
      </p>

      {/* =============================================
          IMPROVEMENTS
      ============================================= */}

      {improvements.length > 0 && (
        <ul className="ai-feature-list">

          {improvements.map(
            (item, index) => (
              <li
                key={`${item}-${index}`}
              >
                <Check size={14} />

                {typeof item === "string"
                  ? item
                  : item?.description ||
                    item?.change ||
                    "Resume improvement applied."}
              </li>
            )
          )}

        </ul>
      )}

      {/* =============================================
          EDIT
      ============================================= */}

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