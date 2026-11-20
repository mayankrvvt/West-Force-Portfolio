import type { Request, Response } from "express";
import type Stripe from "stripe";
import { getStripe, getWebhookSecret } from "../../lib/clients/stripe";
import { AppError } from "../../lib/errors";
import { ok } from "../../lib/respond";
import { parse } from "../../lib/validate";
import { currentUser } from "../../middleware/auth";
import { Purchase } from "./model";
import { checkoutBody, confirmBody } from "./schema";
import {
  confirmCheckout,
  findUserEntitlement,
  fulfillPaidPurchase,
  startCheckout,
} from "./service";

export async function getPaymentStatus(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const entitlement = await findUserEntitlement(user);

  ok(res, {
    isPaid: Boolean(entitlement),
    plan: entitlement?.plan || null,
    email: user.email || "",
    emailVerificationRequired:
      !entitlement && Boolean(user.email) && user.email_verified !== true,
  });
}

export async function confirm(req: Request, res: Response): Promise<void> {
  const { sessionId } = parse(confirmBody, req.body);
  const result = await confirmCheckout(currentUser(req), sessionId);

  ok(res, result);
}

export async function checkout(req: Request, res: Response): Promise<void> {
  const user = currentUser(req);
  const email = String(user.email || "").trim().toLowerCase();

  // The account email is checked before the body, as before.
  if (!email) {
    throw new AppError(400, "Your signed-in account must have an email address.");
  }

  const body = parse(checkoutBody, req.body);
  const checkoutUrl = await startCheckout(user, email, body.plan, body.memberEmails);

  ok(res, { checkoutUrl }, 201);
}

const PAID_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

/**
 * POST /api/payments/webhook. Mounted in app.ts with express.raw() before
 * express.json(), because the signature is checked against the raw body.
 * Stripe reads only the status, so replies stay plain text / {received:true}.
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const log = req.log;
  const webhookSecret = getWebhookSecret();

  if (!webhookSecret) {
    res.status(503).send("Stripe webhook is not configured.");
    return;
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      req.body as Buffer,
      req.headers["stripe-signature"] ?? "",
      webhookSecret
    );
  } catch (error) {
    log.warn(
      { reason: error instanceof Error ? error.message : String(error) },
      "Stripe webhook signature verification failed"
    );
    res.status(400).send("Invalid Stripe webhook signature.");
    return;
  }

  if (!PAID_EVENTS.has(event.type)) {
    res.json({ received: true });
    return;
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== "paid") {
    res.json({ received: true });
    return;
  }

  try {
    const purchase = await Purchase.findOne({
      _id: session.metadata?.purchaseId,
      stripeSessionId: session.id,
    });

    if (!purchase) {
      log.error({ sessionId: session.id }, "Stripe payment has no matching purchase");
      res.status(404).send("Purchase not found.");
      return;
    }

    await fulfillPaidPurchase(session, purchase);

    res.json({ received: true });
  } catch (error) {
    log.error({ err: error }, "Stripe webhook processing failed");

    if (error instanceof AppError && error.status === 400) {
      res.status(400).send(error.message);
      return;
    }

    res.status(500).send("Webhook processing failed.");
  }
}
