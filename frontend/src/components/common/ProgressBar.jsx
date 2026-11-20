export default function ProgressBar({
  value = 0,
  label = "Progress",
}) {
  const percentage = Math.round(
    Math.max(0, Math.min(100, value))
  );

  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
    >
      <div
        className="progress-value"
        style={{
          width: `${percentage}%`
        }}
      />
    </div>
  );
}
