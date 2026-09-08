import DashboardLayout from "../../components/layout/DashboardLayout";

export default function Settings() {
  return (
    <DashboardLayout title="Settings">
      <div className="dashboard-card">
        <h2>Settings</h2>

        <p>
          Account, privacy, portfolio sharing and
          notification settings.
        </p>
      </div>
    </DashboardLayout>
  );
}