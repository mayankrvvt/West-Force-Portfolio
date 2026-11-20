/**
 * Format a date as "17 Nov 2026". Returns "" for empty or invalid input,
 * so callers can render it conditionally.
 */
export function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
