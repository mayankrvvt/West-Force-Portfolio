import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

const STATUS = {
  pass: { Icon: CheckCircle2, text: "Passed" },
  warn: { Icon: AlertTriangle, text: "Needs work" },
  fail: { Icon: XCircle, text: "Missing" },
};

/** A plain word for the score, so the number is never the only signal. */
export function scoreBand(score) {
  if (score >= 80) return "Strong match";
  if (score >= 60) return "Good start";
  return "Needs work";
}

const formatPoints = (value) => (Number.isInteger(value) ? value : value.toFixed(1));

/**
 * The ATS score and how it was worked out. The bar shows each check's share
 * of 100 (its width) and how much of that share was earned (its fill).
 */
export default function ScoreBreakdown({ score, breakdown = [] }) {
  return (
    <div className="ats-breakdown">
      <div className="ats-score-head">
        <p className="ats-score-number">
          <strong>{score}</strong>
          <span>out of 100</span>
        </p>
        <p className="ats-score-band">{scoreBand(score)}</p>
      </div>

      <div className="ats-points-bar" aria-hidden="true">
        {breakdown.map((check) => (
          <span
            key={check.id}
            className={`ats-points-segment is-${check.status}`}
            style={{ flexGrow: check.weight, "--fill": `${(check.points / check.weight) * 100}%` }}
          />
        ))}
      </div>

      <ol className="ats-check-list">
        {breakdown.map((check) => {
          const { Icon, text } = STATUS[check.status] || STATUS.warn;
          return (
            <li key={check.id} className={`ats-check is-${check.status}`}>
              <div className="ats-check-head">
                <Icon size={16} aria-hidden="true" className="ats-check-icon" />
                <span className="sr-only">{text}:</span>
                <strong>{check.label}</strong>
                <span className="ats-check-points">
                  {formatPoints(check.points)} / {check.weight}
                  <span className="sr-only"> points</span>
                </span>
              </div>
              <p className="ats-check-detail">{check.detail}</p>
              {check.fixes?.length > 0 && (
                <ul className="ats-check-fixes">
                  {check.fixes.map((fix) => <li key={fix}>{fix}</li>)}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
