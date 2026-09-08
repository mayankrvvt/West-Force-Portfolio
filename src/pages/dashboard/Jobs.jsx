import DashboardLayout from "../../components/layout/DashboardLayout";

export default function Jobs() {
  return (
    <DashboardLayout title="Jobs">
      <div className="empty-state">
        <h2>
          Recommended opportunities
        </h2>

        <p>
          Future RCIP job matching will appear here.
        </p>
      </div>
    </DashboardLayout>
  );
}