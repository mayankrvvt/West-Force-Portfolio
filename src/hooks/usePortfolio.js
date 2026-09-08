import { useState } from "react";

import {
  initialPortfolioState,
} from "../features/portfolio/portfolioState";

export default function usePortfolio() {
  const [
    portfolio,
    setPortfolio,
  ] = useState(
    initialPortfolioState
  );

  function updatePortfolio(
    section,
    value
  ) {
    setPortfolio((current) => ({
      ...current,
      [section]: value,
    }));
  }

  return {
    portfolio,
    updatePortfolio,
  };
}