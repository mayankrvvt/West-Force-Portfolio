import DashboardLayout from "../../components/layout/DashboardLayout";
import CertificateCard from "../../components/portfolio/CertificateCard";

export default function Certificates() {
  return (
    <DashboardLayout title="Certificates">
      <div className="dashboard-list">
        <CertificateCard
          name="Professional Certificate"
        />

        <CertificateCard
          name="Training Certificate"
        />
      </div>
    </DashboardLayout>
  );
}