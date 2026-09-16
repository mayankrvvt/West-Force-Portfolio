export default function CertificateCard({
  name = "Certificate",
}) {
  return (
    <article className="certificate-card">
      <div className="certificate-icon">
        ✓
      </div>

      <div>
        <strong>{name}</strong>

        <span>
          Verified credential
        </span>
      </div>
    </article>
  );
}