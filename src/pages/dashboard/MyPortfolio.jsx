import PortfolioPreview from "../../components/portfolio/PortfolioPreview";

export default function MyPortfolio() {
  return (
    <div className="dashboard-page">
      <PortfolioPreview
        profile={{
          name: "Candidate Name",
          headline: "Professional Candidate",
          about:
            "Your professional portfolio preview will appear here.",
        }}
      />
    </div>
  );
}