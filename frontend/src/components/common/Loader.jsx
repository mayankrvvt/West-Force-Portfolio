export default function Loader({
  label = "Loading..."
}) {
  return (
    <div className="loader-wrapper" role="status">
      <span className="loader" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
