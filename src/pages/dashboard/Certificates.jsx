import CertificateCard from "../../components/portfolio/CertificateCard";

export default function Certificates() {
  return (
    <div className="dashboard-list">
      <CertificateCard name="Professional Certificate" />

      <CertificateCard name="Training Certificate" />
    </div>
  );
}