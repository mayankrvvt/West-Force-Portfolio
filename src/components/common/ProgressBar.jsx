export default function ProgressBar({
  value = 0
}) {
  const percentage = Math.max(
    0,
    Math.min(100, value)
  );

  return (
    <div className="progress">

      <div className="progress-track">
        <div
          className="progress-value"
          style={{
            width: `${percentage}%`
          }}
        />
      </div>

      <span>
        {percentage}%
      </span>

    </div>
  );
}