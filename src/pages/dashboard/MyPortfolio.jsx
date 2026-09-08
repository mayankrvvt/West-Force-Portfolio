import DashboardLayout from "../../components/layout/DashboardLayout";
import PortfolioPreview from "../../components/portfolio/PortfolioPreview";

export default function MyPortfolio() {
  return (
    <DashboardLayout title="My Portfolio">
      <PortfolioPreview
        profile={{
          name: "Candidate Name",
          headline: "Professional Candidate",
          about:
            "Your professional portfolio preview will appear here.",
        }}
      />
    </DashboardLayout>
  );
}