import { apiRequest } from "../utils/api";

export function createCheckoutSession(plan, memberEmails = []) {
  return apiRequest("/api/payments/checkout", {
    method: "POST",
    body: JSON.stringify({
      plan,
      memberEmails,
    }),
  });
}
