import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Upload, X } from "lucide-react";
import Button from "./Button";
import Input from "./Input";
import "../../styles/onboarding.css";

const TOTAL_STEPS = 7;

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Page frame for the short onboarding steps: logo, a quiet exit link,
 * a segmented step meter, one heading and the step's content.
 */
export function OnboardingShell({
  step,
  total = TOTAL_STEPS,
  title,
  description,
  wide = false,
  exitTo = "/dashboard",
  children,
}) {
  const stepNumber = Number.parseInt(step, 10) || 0;

  return (
    <div className={`ob-page${wide ? " ob-page-wide" : ""}`}>
      <header className="ob-top">
        <Link to="/" className="ob-brand">
          <img src="/favicon.png" alt="" className="ob-brand-mark" width="30" height="30" />
          <span>WestForce</span>
        </Link>

        {exitTo && (
          <Link to={exitTo} className="ob-exit">
            Exit setup
          </Link>
        )}
      </header>

      <main className="ob-main">
        {stepNumber > 0 && (
          <div className="ob-progress">
            <p className="ob-progress-label">
              Step {stepNumber} of {total}
            </p>

            <ol className="ob-meter" aria-hidden="true">
              {Array.from({ length: total }, (_, index) => (
                <li
                  key={index}
                  className={
                    index < stepNumber - 1
                      ? "is-done"
                      : index === stepNumber - 1
                        ? "is-current"
                        : undefined
                  }
                />
              ))}
            </ol>
          </div>
        )}

        <div className="ob-head">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>

        {children}
      </main>
    </div>
  );
}

/**
 * Back, skip and continue row shared by the short onboarding steps.
 * `onContinue` turns Continue into a plain button; without it Continue submits the form.
 */
export function OnboardingActions({ next, onContinue, continueLabel = "Continue", skip = true }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="ob-actions">
      <Button
        variant="ghost"
        className="ob-back"
        onClick={() => (location.key !== "default" ? navigate(-1) : navigate("/dashboard"))}
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back
      </Button>

      <div className="ob-actions-end">
        {skip && next && (
          <button type="button" className="ob-skip" onClick={() => navigate(next)}>
            Skip for now
          </button>
        )}

        <Button type={onContinue ? "button" : "submit"} onClick={onContinue}>
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * Short onboarding step. `fields` is a list of
 * [name, label, type, { hint, placeholder, optional, autoComplete }].
 */
export default function OnboardingForm({
  step,
  title,
  description,
  next,
  fields = [],
  fileUpload = false,
}) {
  const navigate = useNavigate();

  const [form, setForm] = useState({});
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [dragging, setDragging] = useState(false);

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: "" }));
    }
  }

  function addFiles(list) {
    const incoming = Array.from(list || []);

    if (incoming.length === 0) return;

    setFiles((current) => {
      const seen = new Set(current.map((file) => `${file.name}-${file.size}`));
      return [...current, ...incoming.filter((file) => !seen.has(`${file.name}-${file.size}`))];
    });
  }

  function handleFileChange(event) {
    addFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer?.files);
  }

  function removeFile(target) {
    setFiles((current) => current.filter((file) => file !== target));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = {};

    fields.forEach(([name, label, type, options = {}]) => {
      if (type === "textarea" || options.optional) return;
      if (!String(form[name] || "").trim()) {
        nextErrors[name] = `Add your ${label.toLowerCase()}, or skip this step for now.`;
      }
    });

    setErrors(nextErrors);

    const firstInvalid = fields.find(([name]) => nextErrors[name]);

    if (firstInvalid) {
      document.getElementById(firstInvalid[0])?.focus();
      return;
    }

    // Frontend-only for now: the onboarding data
    // will later be sent to the backend.
    navigate(next);
  }

  return (
    <OnboardingShell step={step} title={title} description={description}>
      <form onSubmit={handleSubmit} className="ob-form" noValidate>
        {fields.map(([name, label, type, options = {}]) => {
          if (type === "textarea") {
            const hintId = options.hint ? `${name}-hint` : undefined;

            return (
              <div className="form-field" key={name}>
                <label htmlFor={name}>
                  {label}
                  <span className="ob-optional">Optional</span>
                </label>

                <textarea
                  id={name}
                  name={name}
                  rows="5"
                  className="ob-textarea"
                  value={form[name] || ""}
                  onChange={(event) =>
                    updateField(name, event.target.value)
                  }
                  placeholder={options.placeholder}
                  aria-describedby={hintId}
                />

                {options.hint && (
                  <span id={hintId} className="form-hint">
                    {options.hint}
                  </span>
                )}
              </div>
            );
          }

          return (
            <Input
              key={name}
              id={name}
              name={name}
              label={label}
              type={type}
              value={form[name] || ""}
              onChange={(event) =>
                updateField(name, event.target.value)
              }
              placeholder={options.placeholder}
              hint={options.hint}
              autoComplete={options.autoComplete}
              error={errors[name]}
              required={!options.optional}
            />
          );
        })}

        {fileUpload && (
          <div className="ob-upload">
            <label
              htmlFor="documents"
              className={`ob-dropzone${dragging ? " is-dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <span className="ob-dropzone-icon" aria-hidden="true">
                <Upload size={20} />
              </span>

              <span className="ob-dropzone-title">
                Choose files or drag them here
              </span>

              <span className="ob-dropzone-hint">
                PDF, Word, JPG or PNG. You can add more later.
              </span>

              <input
                id="documents"
                name="documents"
                type="file"
                multiple
                className="ob-file-input"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
            </label>

            {files.length > 0 ? (
              <ul className="ob-file-list" aria-label={`${files.length} file${files.length > 1 ? "s" : ""} selected`}>
                {files.map((file) => (
                  <li key={`${file.name}-${file.size}`} className="ob-file">
                    <FileText size={18} aria-hidden="true" className="ob-file-icon" />
                    <span className="ob-file-name" title={file.name}>
                      {file.name}
                    </span>
                    <span className="ob-file-size">{formatSize(file.size)}</span>
                    <button
                      type="button"
                      className="ob-file-remove"
                      onClick={() => removeFile(file)}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ob-empty-note">No files added yet.</p>
            )}
          </div>
        )}

        <OnboardingActions next={next} />
      </form>
    </OnboardingShell>
  );
}
