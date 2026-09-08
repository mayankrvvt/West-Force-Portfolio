import { useParams } from "react-router-dom";
import PortfolioPreview from "../../components/portfolio/PortfolioPreview";

export default function PublicPortfolio() {
  const { slug } = useParams();

  const candidateName =
    slug
      ?.replaceAll("-", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      ) || "Candidate";

  return (
    <main className="public-portfolio-page">
      <PortfolioPreview
        profile={{
          name: candidateName,
          headline: "Professional Candidate",
          about:
            "Public portfolio preview.",
        }}
      />
    </main>
  );
}