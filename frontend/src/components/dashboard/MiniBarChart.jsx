import { useId, useState } from "react";

const HEIGHT = 96;
const TOP_ROOM = 18; // space above the tallest bar for its value
const BAR_SHARE = 0.68; // bar width as a share of its slot; the rest is air
const RADIUS = 2;

/**
 * Small column chart in plain SVG. One series, so no legend: the card title
 * says what is plotted. x positions use percentages so it stays crisp at any
 * width without a viewBox stretch.
 *
 * data: [{ label, value }] oldest first. Labels are shown in the tooltip,
 * the axis and the screen reader table.
 */
export default function MiniBarChart({ data = [], ariaLabel, formatValue = (value) => String(value) }) {
  const clipId = useId();
  const [active, setActive] = useState(null);

  const count = data.length;
  if (!count) return null;

  const values = data.map((item) => Math.max(0, Number(item.value) || 0));
  const max = Math.max(...values);
  const peakIndex = max > 0 ? values.lastIndexOf(max) : -1;
  const plot = HEIGHT - TOP_ROOM;
  const slot = 100 / count;
  const barWidth = slot * BAR_SHARE;

  const heightOf = (value) => (max > 0 ? Math.max(value > 0 ? 3 : 0, (value / max) * plot) : 0);
  const xOf = (index) => index * slot + (slot - barWidth) / 2;

  const activeItem = active === null ? null : data[active];
  const tooltipLeft = active === null ? 0 : Math.min(88, Math.max(12, (active + 0.5) * slot));

  return (
    <figure className="mini-bar-chart" onMouseLeave={() => setActive(null)}>
      <div className="mini-bar-chart-plot">
        <svg
          className="mini-bar-chart-svg"
          width="100%"
          height={HEIGHT}
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x="0" y="0" width="100%" height={HEIGHT} />
            </clipPath>
          </defs>

          <g clipPath={`url(#${clipId})`}>
            {values.map((value, index) => {
              const h = heightOf(value);
              if (!h) return null;
              return (
                <rect
                  key={index}
                  className={`mini-bar-chart-bar${active === index ? " is-active" : ""}`}
                  x={`${xOf(index)}%`}
                  y={HEIGHT - h}
                  width={`${barWidth}%`}
                  // Runs past the baseline and is clipped, so only the top corners are round.
                  height={h + RADIUS * 2}
                  rx={RADIUS}
                  style={{ animationDelay: `${Math.min(index * 12, 360)}ms` }}
                />
              );
            })}
          </g>

          <line className="mini-bar-chart-baseline" x1="0" x2="100%" y1={HEIGHT - 0.5} y2={HEIGHT - 0.5} />

          {peakIndex >= 0 && (
            <text
              className="mini-bar-chart-peak"
              x={`${Math.min(97, Math.max(3, (peakIndex + 0.5) * slot))}%`}
              y={HEIGHT - heightOf(max) - 6}
              textAnchor="middle"
            >
              {max}
            </text>
          )}

          {/* Hit targets: the whole slot, taller and wider than the bar. */}
          {data.map((item, index) => (
            <rect
              key={`hit-${index}`}
              className="mini-bar-chart-hit"
              x={`${index * slot}%`}
              y="0"
              width={`${slot}%`}
              height={HEIGHT}
              onMouseEnter={() => setActive(index)}
              onClick={() => setActive(index)}
            />
          ))}
        </svg>

        {activeItem && (
          <div className="mini-bar-chart-tooltip" style={{ left: `${tooltipLeft}%` }} aria-hidden="true">
            <strong>{formatValue(values[active])}</strong>
            <span>{activeItem.label}</span>
          </div>
        )}
      </div>

      <figcaption className="mini-bar-chart-axis" aria-hidden="true">
        <span>{data[0].label}</span>
        <span>{data[count - 1].label}</span>
      </figcaption>

      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={index}>
              <th scope="row">{item.label}</th>
              <td>{values[index]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
