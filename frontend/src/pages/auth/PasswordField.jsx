import { useId, useState } from "react";
import { Check, Eye, EyeOff } from "lucide-react";

/**
 * Password input with a show/hide button. Same markup and classes as the
 * shared Input (label, hint, inline error) so it lines up with the other fields.
 * `rule` shows a live "at least N characters" check under the field.
 */
export default function PasswordField({
  label,
  hint,
  error,
  id,
  rule,
  className = "",
  ...props
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const [visible, setVisible] = useState(false);

  const hintId = hint ? `${inputId}-hint` : undefined;
  const ruleId = rule ? `${inputId}-rule` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, ruleId, errorId].filter(Boolean).join(" ") || undefined;

  const ruleMet = rule ? String(props.value || "").length >= rule : false;

  return (
    <div className="form-field">
      {label && <label htmlFor={inputId}>{label}</label>}

      <div className="auth-password">
        <input
          {...props}
          id={inputId}
          // `type` comes after the spread so the show/hide button always wins.
          type={visible ? "text" : "password"}
          className={["input", error ? "input-error" : "", className].filter(Boolean).join(" ")}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          spellCheck={false}
        />

        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={inputId}
          disabled={props.disabled}
        >
          {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>

      {hint && (
        <span id={hintId} className="form-hint">
          {hint}
        </span>
      )}

      {rule && (
        <span id={ruleId} className={`auth-rule${ruleMet ? " is-met" : ""}`}>
          <span className="auth-rule-mark" aria-hidden="true">
            <Check size={12} strokeWidth={3} />
          </span>
          At least {rule} characters
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
