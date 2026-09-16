export async function getPortfolio() {
  return {
    id: "demo-portfolio",
    slug: "candidate-name",
    published: false,
  };
}

export async function savePortfolio(
  portfolio
) {
  return {
    success: true,
    portfolio,
  };
}