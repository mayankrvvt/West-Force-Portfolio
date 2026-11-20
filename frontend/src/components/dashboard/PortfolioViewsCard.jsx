import { useCallback, useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { getMyInsights } from "../../services/insightsService";
import { formatDate } from "../../utils/formatDate";
import { SkeletonRows } from "./Skeleton";
import MiniBarChart from "./MiniBarChart";
import "../../styles/insights.css";

const DAYS = 30;

/* "2026-11-17" is a UTC calendar day; read it at local noon so it never slips a day. */
const dayDate = (day) => formatDate(`${day}T12:00:00`);
const shortDay = (day) => dayDate(day).replace(/\s\d{4}$/, "");

const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

function activityText(item) {
  if (item.type === "unlock") return "Someone unlocked your documents";
  if (item.type === "document") return `Someone opened ${item.documentName || "a document"}`;
  return "Someone viewed your portfolio";
}

/**
 * Portfolio views for the signed-in owner.
 * compact: totals and the 30-day chart (dashboard home).
 * full: also which documents were opened and recent activity (My portfolio).
 */
export default function PortfolioViewsCard({ compact = false }) {
  const titleId = useId();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (isCancelled = () => false) => {
    setLoading(true);
    setError("");
    try {
      const result = await getMyInsights(DAYS);
      if (!isCancelled()) setData(result);
    } catch (err) {
      if (!isCancelled()) setError(err.message || "Could not load your portfolio views.");
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const totals = data?.totals || {};
  const daily = Array.isArray(data?.daily) ? data.daily : [];
  const documents = Array.isArray(data?.documents) ? data.documents : [];
  const recent = Array.isArray(data?.recent) ? data.recent : [];
  const views = totals.views || 0;

  const chartData = daily.map((row, index) => ({
    label: index === daily.length - 1 ? "Today" : shortDay(row.day),
    value: row.views || 0,
  }));

  return (
    <section
      className="product-card insights-card"
      aria-labelledby={titleId}
      aria-busy={loading}
    >
      <div className="product-card-header">
        <div>
          <h2 id={titleId}>Portfolio views</h2>
          <p>Who looked at your portfolio in the last {DAYS} days.</p>
        </div>
        {compact && (
          <Link className="product-button compact" to="/dashboard/portfolio">
            See details
          </Link>
        )}
      </div>

      {loading && <SkeletonRows count={2} label="Loading your portfolio views" />}

      {!loading && error && (
        <div className="product-error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
          <button type="button" className="product-link insights-retry" onClick={() => load()}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <dl className="insights-totals">
            <div className="insights-total">
              <dt>Views</dt>
              <dd>{views}</dd>
            </div>
            <div className="insights-total">
              <dt>PIN unlocks</dt>
              <dd>{totals.unlocks || 0}</dd>
            </div>
            <div className="insights-total">
              <dt>Documents opened</dt>
              <dd>{totals.documentOpens || 0}</dd>
            </div>
          </dl>

          {views > 0 ? (
            <MiniBarChart
              data={chartData}
              ariaLabel={`Views per day for the last ${DAYS} days. ${plural(views, "view")} in total.`}
              formatValue={(value) => plural(value, "view")}
            />
          ) : (
            <p className="application-empty insights-empty">
              Nothing here yet. Share your portfolio link and views will show up here.
            </p>
          )}

          {!compact && (
            <div className="insights-detail-grid">
              <div className="application-column insights-column insights-column-documents">
                <div className="application-column-header">
                  <span className="application-column-dot" aria-hidden="true" />
                  <strong>Documents opened</strong>
                  <span className="application-count">{documents.length}</span>
                </div>
                {documents.length ? (
                  <ul className="insights-list">
                    {documents.map((item) => (
                      <li className="insights-item" key={item.documentId}>
                        <strong>{item.name}</strong>
                        <span>
                          Opened {plural(item.opens, "time")}
                          {item.lastOpenedAt && <>, last on {formatDate(item.lastOpenedAt)}</>}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="application-empty">Nothing here yet</p>
                )}
              </div>

              <div className="application-column insights-column insights-column-activity">
                <div className="application-column-header">
                  <span className="application-column-dot" aria-hidden="true" />
                  <strong>Recent activity</strong>
                  <span className="application-count">{recent.length}</span>
                </div>
                {recent.length ? (
                  <ol className="insights-list">
                    {recent.map((item, index) => (
                      <li className="insights-item" key={`${item.type}-${item.at}-${index}`}>
                        <strong>{activityText(item)}</strong>
                        <time dateTime={new Date(item.at).toISOString()}>{formatDate(item.at)}</time>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="application-empty">Nothing here yet</p>
                )}
              </div>
            </div>
          )}

          <p className="insights-privacy">
            <ShieldCheck size={14} aria-hidden="true" />
            Each visitor counts once a day. We never keep IP addresses, and your own visits are not counted.
          </p>
        </>
      )}
    </section>
  );
}
