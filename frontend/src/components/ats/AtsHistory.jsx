import { useState } from "react";
import { formatDate } from "../../utils/formatDate";
import { SkeletonRows } from "../dashboard/Skeleton";

const W = 560;
const H = 160;
const PAD = { top: 16, right: 40, bottom: 24, left: 32 };
const TICKS = [0, 50, 100];

/** One series of scores over time: a 2px line, ringed dots and a hover tooltip. */
function TrendChart({ points }) {
  const [active, setActive] = useState(null);
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (score) => PAD.top + innerH - (score / 100) * innerH;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const first = points[0];
  const last = points[points.length - 1];
  const summary = `ATS score over your last ${points.length} checks, from ${first.score} on ${formatDate(first.createdAt)} to ${last.score} on ${formatDate(last.createdAt)}.`;
  const hovered = active === null ? null : points[active];

  return (
    <div className="ats-trend" onMouseLeave={() => setActive(null)}>
      <svg className="ats-trend-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
        {TICKS.map((tick) => (
          <g key={tick} className="ats-trend-grid">
            <line x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} />
            <text x={PAD.left - 8} y={y(tick)} dy="0.35em" textAnchor="end">{tick}</text>
          </g>
        ))}
        <path className="ats-trend-area" d={area} />
        <path className="ats-trend-line" d={line} pathLength="1" />
        {points.map((p, i) => (
          <circle
            key={p._id}
            className={`ats-trend-dot${active === i ? " is-active" : ""}`}
            cx={x(i)}
            cy={y(p.score)}
            r={active === i ? 6 : 4}
          />
        ))}
        <text className="ats-trend-end" x={x(points.length - 1) + 10} y={y(last.score)} dy="0.35em">
          {last.score}
        </text>
        {/* Hit areas wider than the dots, one column per check. */}
        <g aria-hidden="true">
          {points.map((p, i) => (
            <rect
              key={p._id}
              className="ats-trend-hit"
              x={x(i) - innerW / Math.max(points.length - 1, 1) / 2}
              y={PAD.top - 8}
              width={innerW / Math.max(points.length - 1, 1)}
              height={innerH + 16}
              onMouseEnter={() => setActive(i)}
              onClick={() => setActive(i)}
            />
          ))}
        </g>
      </svg>
      {hovered && (
        <div
          className="ats-trend-tip"
          style={{ left: `${(x(active) / W) * 100}%`, top: `${(y(hovered.score) / H) * 100}%` }}
          aria-hidden="true"
        >
          <strong>{hovered.score}</strong>
          <span>{formatDate(hovered.createdAt)}</span>
          {hovered.jobTitle && <span>{hovered.jobTitle}</span>}
        </div>
      )}
    </div>
  );
}

/** Past ATS checks: a trend chart (two or more checks) and a list, newest first. */
export default function AtsHistory({ checks = [], loading = false, error = "" }) {
  const oldestFirst = [...checks].reverse();

  return (
    <section className="product-card ats-history" aria-labelledby="ats-history-title">
      <div className="ats-history-head">
        <span className="ats-history-dot" aria-hidden="true" />
        <h2 id="ats-history-title">Your past checks</h2>
        <span className="ats-history-count">{checks.length}</span>
      </div>

      {loading ? (
        <SkeletonRows count={3} label="Loading your past checks" />
      ) : error ? (
        <p className="ats-history-empty" role="status">{error}</p>
      ) : checks.length === 0 ? (
        <p className="ats-history-empty">Nothing here yet. Your checks will show up here.</p>
      ) : (
        <>
          {oldestFirst.length > 1 ? (
            <TrendChart points={oldestFirst} />
          ) : (
            <p className="ats-history-empty">Run one more check to see your trend.</p>
          )}
          <ol className="ats-history-list">
            {checks.map((item, index) => {
              const previous = checks[index + 1];
              const change = previous ? item.score - previous.score : null;
              return (
                <li key={item._id} className="ats-history-item">
                  <div className="ats-history-text">
                    <strong>{item.jobTitle || "Untitled job"}</strong>
                    <span>{item.resumeTitle || "Resume"} on {formatDate(item.createdAt)}</span>
                  </div>
                  {change !== null && change !== 0 && (
                    <span className={`ats-history-change ${change > 0 ? "is-up" : "is-down"}`}>
                      {change > 0 ? `+${change}` : change}
                      <span className="sr-only"> since the check before</span>
                    </span>
                  )}
                  <span className="ats-history-score">{item.score}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
