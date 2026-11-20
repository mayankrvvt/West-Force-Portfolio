import type { DecodedIdToken } from "firebase-admin/auth";
import type Stripe from "stripe";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { getFrontendUrl, getStripe } from "../../lib/clients/stripe";
import {
  Entitlement,
  type EntitlementDocument,
  type PlanKey,
  Purchase,
  type PurchaseDocument,
} from "./model";

export const PLANS: Record<PlanKey, { name: string; amount: number }> = {
  solo: { name: "WestForce Solo", amount: 99900 },
  group5: { name: "WestForce Group of 5", amount: 349500 },
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The user's entitlement by uid, or claim an unclaimed seat for their verified email. */
export async function findUserEntitlement(
  user: DecodedIdToken
): Promise<EntitlementDocument | null> {
  const byUid = await Entitlement.findOne({ firebaseUid: user.uid });

  if (byUid) {
    return byUid;
  }

  if (!user.email || user.email_verified !== true) {
    return null;
  }

  return Entitlement.findOneAndUpdate(
    {
      email: user.email.trim().toLowerCase(),
      $or: [
        { firebaseUid: null },
        { firebaseUid: { $exists: false } },
        { firebaseUid: user.uid },
      ],
    },
    { $set: { firebaseUid: user.uid } },
    { returnDocument: "after" }
  );
}

export function normalizeEmails(emails: unknown): string[] | null {
  if (!Array.isArray(emails)) {
    return null;
  }

  return emails
    .map((email) => String(email || "").trim().toLowerCase())
    .filter(Boolean);
}

/** Grant a seat to every email of a paid purchase (idempotent) and mark it paid. */
export async function fulfillPaidPurchase(
  session: Stripe.Checkout.Session,
  purchase: PurchaseDocument
): Promise<void> {
  if (session.amount_total !== purchase.totalAmount || session.currency !== "cad") {
    throw new AppError(400, "Payment amount does not match purchase.");
  }

  const paidAt = new Date();
  const emails = [purchase.purchaserEmail, ...purchase.memberEmails];

  await Promise.all(
    emails.map((email) =>
      Entitlement.updateOne(
        { email },
        {
          $setOnInsert: {
            email,
            firebaseUid: email === purchase.purchaserEmail ? purchase.firebaseUid : null,
            plan: purchase.plan,
            purchaseId: purchase._id,
            grantedAt: paidAt,
          },
        },
        { upsert: true }
      )
    )
  );

  await Purchase.updateOne(
    { _id: purchase._id, status: { $ne: "paid" } },
    {
      $set: {
        status: "paid",
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : "",
        paidAt,
      },
    }
  );
}

/** Check the group emails, create a pending purchase and a Stripe Checkout Session. */
export async function startCheckout(
  user: DecodedIdToken,
  email: string,
  planKey: PlanKey,
  rawMemberEmails: unknown
): Promise<string | null> {
  const plan = PLANS[planKey];
  const memberEmails = planKey === "group5" ? normalizeEmails(rawMemberEmails) : [];

  if (planKey === "group5" && (!memberEmails || memberEmails.length !== 4)) {
    throw new AppError(400, "Enter four additional email addresses for the group plan.");
  }

  const members = memberEmails ?? [];

  if (
    members.includes(email) ||
    new Set(members).size !== members.length ||
    members.some((memberEmail) => !EMAIL_PATTERN.test(memberEmail))
  ) {
    throw new AppError(
      400,
      "Group emails must be valid, unique, and different from your account email."
    );
  }

  if (await findUserEntitlement(user)) {
    throw new AppError(409, "This account already has full access.", {
      code: "ALREADY_PAID",
    });
  }

  const existingSeats = await Entitlement.find({
    email: { $in: [email, ...members] },
  }).select("email");

  if (existingSeats.length > 0) {
    throw new AppError(
      409,
      "One or more group email addresses already have an active plan. Use different email addresses."
    );
  }

  const purchase = await Purchase.create({
    firebaseUid: user.uid,
    purchaserEmail: email,
    memberEmails: members,
    plan: planKey,
    totalAmount: plan.amount,
  });

  try {
    const frontendUrl = getFrontendUrl();
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      client_reference_id: String(purchase._id),
      metadata: { purchaseId: String(purchase._id) },
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: plan.name,
              description:
                planKey === "group5"
                  ? "One-time access for five individual accounts"
                  : "One-time access for one account",
            },
            unit_amount: plan.amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment/cancelled`,
    });

    await Purchase.updateOne({ _id: purchase._id }, { $set: { stripeSessionId: session.id } });

    return session.url;
  } catch (error) {
    await Purchase.updateOne(
      { _id: purchase._id, status: "pending" },
      { $set: { status: "failed" } }
    ).catch((updateError: unknown) => {
      logger.error({ err: updateError }, "Failed to mark checkout purchase as failed");
    });

    throw error;
  }
}

/** Look up a Checkout Session for this user and fulfil it if paid. */
export async function confirmCheckout(
  user: DecodedIdToken,
  sessionId: string
): Promise<{ isPaid: false } | { isPaid: true; plan: string }> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  const purchase = await Purchase.findOne({
    stripeSessionId: session.id,
    firebaseUid: user.uid,
  });

  if (!purchase || session.metadata?.purchaseId !== String(purchase._id)) {
    throw new AppError(404, "Checkout session not found for this account.");
  }

  if (session.payment_status !== "paid") {
    return { isPaid: false };
  }

  await fulfillPaidPurchase(session, purchase);

  return { isPaid: true, plan: purchase.plan };
}
