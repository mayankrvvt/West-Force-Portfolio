import DashboardLayout from "../../components/layout/DashboardLayout";

export default function Profile() {
  return (
    <DashboardLayout title="Profile">
      <div className="dashboard-card">
        <h2>Candidate profile</h2>

        <p>
          Personal and professional information
          will be managed here.
        </p>
      </div>
    </DashboardLayout>
  );
}