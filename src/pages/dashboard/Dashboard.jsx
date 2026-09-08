import DashboardLayout from "../../components/layout/DashboardLayout";
import ProgressBar from "../../components/common/ProgressBar";
import PortfolioCard from "../../components/portfolio/PortfolioCard";

export default function Dashboard() {
  return (
    <DashboardLayout title="Dashboard">
      <div className="dashboard-grid">
        <section className="dashboard-card">
          <p className="eyebrow">
            PROFILE COMPLETION
          </p>

          <h2>
            Build your employer-ready profile
          </h2>

          <ProgressBar value={72} />
        </section>

        <PortfolioCard
          title="Resume"
          value="Ready"
          action="View"
        />

        <PortfolioCard
          title="Documents"
          value="8 uploaded"
          action="Manage"
        />

        <PortfolioCard
          title="Portfolio"
          value="Draft"
          action="Preview"
        />

        <PortfolioCard
          title="Applications"
          value="0"
          action="View"
        />
      </div>
    </DashboardLayout>
  );
}