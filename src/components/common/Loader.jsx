export default function Loader({
  label = "Loading..."
}) {
  return (
    <div className="loader-wrapper">
      <span className="loader" />
      <span>{label}</span>
    </div>
  );
}