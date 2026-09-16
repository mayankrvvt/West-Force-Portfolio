import { httpsCallable } from "firebase/functions";

import { functions } from "../firebase/firebase";

export async function createCheckoutSession(plan) {
  const createCheckout = httpsCallable(
    functions,
    "createCheckoutSession"
  );

  const result = await createCheckout({
    plan,
  });

  return result.data;
}