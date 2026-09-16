export default function PortfolioCard({
  title,
  value,
  action,
}) {
  return (
    <article className="portfolio-summary-card">
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
      </div>

      {action && (
        <button type="button">
          {action}
        </button>
      )}
    </article>
  );
}