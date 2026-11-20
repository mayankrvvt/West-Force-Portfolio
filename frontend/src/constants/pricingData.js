// price is per person in CAD. Totals: Solo $999, Group of 5 $3,495.
export const plans = [
  {
    key: "solo",

    name: "Solo",

    subtitle: "One portfolio, for you",

    price: 999,

    quantity: 1,

    featured: false,

    features: [
      "Resume ready for applicant tracking systems",
      "Video resume coaching",
      "TestGorilla skills report",
      "Certificates and credentials in one place",
      "Private link with PIN protected documents",
      "One to one sessions with a WestForce coach",
    ],
  },

  {
    key: "group5",

    name: "Group of 5",

    subtitle: "For friends, family or colleagues",

    price: 699,

    quantity: 5,

    featured: true,

    features: [
      "Everything in Solo",
      "5 separate portfolios, each with its own link and PIN",
      "Shared coaching sessions",
      "Priority employer matching",
      "Save $300 CAD per person",
    ],
  },
];
