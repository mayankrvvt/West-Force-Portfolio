import { useId } from "react";

/** Labelled text input with an optional hint and error, linked for screen readers. */
export default function Input({ label, hint, error, id, className = "", ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="form-field">
      {label && <label htmlFor={inputId}>{label}</label>}

      <input
        id={inputId}
        className={["input", error ? "input-error" : "", className].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />

      {hint && (
        <span id={hintId} className="form-hint">
          {hint}
        </span>
      )}

      {error && (
        <span id={errorId} className="form-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
