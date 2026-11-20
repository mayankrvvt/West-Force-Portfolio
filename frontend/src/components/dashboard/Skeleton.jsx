/**
 * Loading placeholders shaped like the page they stand in for.
 * Each layout announces itself once to screen readers.
 */
function Bar({ width = "100%", height, className = "" }) {
  return <span className={`skeleton ${className}`.trim()} style={{ width, height }} />;
}

function Rows({ count = 3 }) {
  return Array.from({ length: count }, (_, index) => (
    <div className="skeleton-row" key={index}>
      <Bar className="skeleton-icon" />
      <div className="skeleton-stack">
        <Bar width="45%" />
        <Bar width="30%" className="skeleton-small" />
      </div>
    </div>
  ));
}

const layouts = {
  dashboard: () => (
    <>
      <div className="skeleton-stack"><Bar width="40%" className="skeleton-title" /><Bar width="60%" /></div>
      <div className="product-card skeleton-stack"><Bar width="35%" /><Bar height="var(--space-2)" /><Bar width="50%" className="skeleton-small" /></div>
      <div className="product-stat-grid">{Array.from({ length: 4 }, (_, i) => <div className="product-stat" key={i}><Bar width="40%" className="skeleton-title" /><Bar width="70%" className="skeleton-small" /></div>)}</div>
      <div className="product-dashboard-grid">
        <div className="product-card skeleton-stack"><Bar width="50%" /><Bar /><Bar width="80%" /></div>
        <div className="product-card skeleton-stack"><Bar width="40%" /><Bar /><Bar width="70%" /></div>
      </div>
    </>
  ),
  list: () => (
    <>
      <div className="skeleton-stack"><Bar width="30%" className="skeleton-title" /><Bar width="55%" /></div>
      <div className="product-card"><Rows count={3} /></div>
    </>
  ),
  grid: () => (
    <>
      <div className="skeleton-stack"><Bar width="30%" className="skeleton-title" /><Bar width="55%" /></div>
      <div className="product-object-grid">{Array.from({ length: 3 }, (_, i) => <div className="product-object" key={i}><Bar className="skeleton-icon" /><Bar width="70%" /><Bar width="40%" className="skeleton-small" /></div>)}</div>
    </>
  ),
  form: () => (
    <>
      <div className="skeleton-stack"><Bar width="25%" className="skeleton-title" /><Bar width="55%" /></div>
      <div className="product-card product-form-grid">{Array.from({ length: 4 }, (_, i) => <div className="skeleton-stack" key={i}><Bar width="35%" className="skeleton-small" /><Bar className="skeleton-input" /></div>)}</div>
    </>
  ),
  board: () => (
    <div className="application-board-scroll"><div className="application-board">{Array.from({ length: 5 }, (_, i) => <div className="application-column" key={i}><Bar width="50%" /><div className="application-card"><Bar width="80%" /><Bar width="50%" className="skeleton-small" /></div></div>)}</div></div>
  ),
  preview: () => (
    <>
      <div className="skeleton-stack"><Bar width="30%" className="skeleton-title" /><Bar width="55%" /></div>
      <div className="product-card skeleton-stack"><Bar height="calc(var(--space-9) * 2.5)" /><Bar width="60%" /><Bar width="40%" /></div>
    </>
  ),
};

export default function PageSkeleton({ layout = "list", label = "Loading" }) {
  const Layout = layouts[layout] || layouts.list;
  return (
    <div className="skeleton-page" role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>
      <div className="skeleton-page-inner" aria-hidden="true"><Layout /></div>
    </div>
  );
}

/** Inline skeleton for a section inside a page that is already showing. */
export function SkeletonRows({ count = 3, label = "Loading" }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}…</span>
      <div aria-hidden="true"><Rows count={count} /></div>
    </div>
  );
}
