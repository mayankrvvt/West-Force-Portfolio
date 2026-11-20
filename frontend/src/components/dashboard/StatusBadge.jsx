/** Quiet tinted badge for an application status (Saved, Applied, Interview, Offer, Rejected). */
export default function StatusBadge({ status }) {
  if (!status) return null;
  const key = String(status).toLowerCase();
  return <span className={`status-badge status-${key}`}>{status}</span>;
}
