import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "./Button";
import Input from "./Input";
import ProgressBar from "./ProgressBar";

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

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleFileChange(event) {
    const selectedFiles = Array.from(event.target.files || []);

    setFiles(selectedFiles);
  }

  function handleSubmit(event) {
    event.preventDefault();

    // Frontend-only for now.
    // This is where the portfolio/onboarding data
    // will later be sent to the backend.
    console.log("Onboarding data:", {
      ...form,
      files,
    });

    navigate(next);
  }

  const stepNumber = Number.parseInt(step, 10) || 1;
  const totalSteps = 7;
  const progress = (stepNumber / totalSteps) * 100;

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-header">
          <Link to="/" className="onboarding-brand">
            <img src="/favicon.png" alt="WestForce" />
            <span>WESTFORCE</span>
          </Link>

          <span className="onboarding-step">
            Step {step}
          </span>
        </div>

        <ProgressBar value={progress} />

        <div className="onboarding-title">
          <p className="eyebrow">BUILD YOUR PROFILE</p>

          <h1>{title}</h1>

          <p>{description}</p>
        </div>

        <form onSubmit={handleSubmit} className="onboarding-form">
          {fields.map(([name, label, type]) => {
            if (type === "textarea") {
              return (
                <div className="input-group" key={name}>
                  <label htmlFor={name}>{label}</label>

                  <textarea
                    id={name}
                    name={name}
                    rows="5"
                    value={form[name] || ""}
                    onChange={(event) =>
                      updateField(name, event.target.value)
                    }
                    placeholder={`Enter your ${label.toLowerCase()}`}
                  />
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
                placeholder={`Enter your ${label.toLowerCase()}`}
                required
              />
            );
          })}

          {fileUpload && (
            <div className="file-upload">
              <label htmlFor="documents">
                Upload documents
              </label>

              <input
                id="documents"
                name="documents"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />

              {files.length > 0 && (
                <div className="selected-files">
                  <p>
                    {files.length} file
                    {files.length > 1 ? "s" : ""} selected
                  </p>

                  <ul>
                    {files.map((file) => (
                      <li key={`${file.name}-${file.size}`}>
                        {file.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="onboarding-actions">
            <Link to="/dashboard" className="skip-link">
              Save & exit
            </Link>

            <Button type="submit">
              Continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}