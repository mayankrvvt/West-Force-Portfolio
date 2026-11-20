import { z } from "zod";
import { PLAN_KEYS } from "./model";
import { toText } from "../../lib/text";

/** Express leaves req.body undefined when no JSON body is sent. */
const orEmpty = (value: unknown) => (value === undefined ? {} : value);

const INVALID_SESSION = "A valid Checkout Session ID is required.";

/** POST /api/payments/checkout. memberEmails is checked in the service (needs the account email). */
export const checkoutBody = z.preprocess(
  orEmpty,
  z.looseObject(
    {
      plan: z.enum(PLAN_KEYS, { error: "Choose a valid plan." }),
      memberEmails: z.unknown().optional(),
    },
    { error: "Choose a valid plan." }
  )
);

/** POST /api/payments/confirm. */
export const confirmBody = z.preprocess(
  orEmpty,
  z.looseObject(
    {
      sessionId: z.preprocess(
        (value) => toText(value || "").trim(),
        z.string().refine((id) => id.startsWith("cs_"), { error: INVALID_SESSION })
      ),
    },
    { error: INVALID_SESSION }
  )
);

export type CheckoutBody = z.output<typeof checkoutBody>;
export type ConfirmBody = z.output<typeof confirmBody>;
