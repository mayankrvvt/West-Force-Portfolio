import DashboardLayout from "../../components/layout/DashboardLayout";

export default function Applications() {
  return (
    <DashboardLayout title="Applications">
      <div className="empty-state">
        <h2>No applications yet</h2>

        <p>
          Future employer applications will be
          tracked here.
        </p>
      </div>
    </DashboardLayout>
  );
}