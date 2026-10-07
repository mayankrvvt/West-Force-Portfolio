export default function Input({
  label,
  error,
  id,
  ...props
}) {
  return (
    <div className="form-field">

      {label && (
        <label htmlFor={id}>
          {label}
        </label>
      )}

      <input
        id={id}
        className={`input ${
          error ? "input-error" : ""
        }`}
        {...props}
      />

      {error && (
        <span className="form-error">
          {error}
        </span>
      )}

    </div>
  );
}