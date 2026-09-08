import DashboardLayout from "../../components/layout/DashboardLayout";
import ResumePreview from "../../components/portfolio/ResumePreview";

export default function Resume() {
  return (
    <DashboardLayout title="Resume">
      <ResumePreview />
    </DashboardLayout>
  );
}