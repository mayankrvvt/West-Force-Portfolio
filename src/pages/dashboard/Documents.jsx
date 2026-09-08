import DashboardLayout from "../../components/layout/DashboardLayout";

export default function Documents() {
  return (
    <DashboardLayout title="Documents">
      <div className="dashboard-card">
        <h2>Your documents</h2>

        <p>
          Resume, certificates and supporting
          documents will appear here.
        </p>

        <input
          type="file"
          multiple
        />
      </div>
    </DashboardLayout>
  );
}