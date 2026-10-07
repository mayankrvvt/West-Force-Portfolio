const express = require("express");
const Stripe = require("stripe");

const authenticateUser = require("../middleware/authMiddleware");
const {
  findUserEntitlement,
} = require("../middleware/requirePaidUser");
const Entitlement = require("../models/Entitlement");
const Purchase = require("../models/Purchase");

const router = express.Router();

const PLANS = {
  solo: {
    name: "WestForce Solo",
    amount: 99900,
  },
  group5: {
    name: "WestForce Group of 5",
    amount: 349500,
  },
};

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const mode = (
    process.env.STRIPE_MODE ||
    (process.env.NODE_ENV === "production" ? "live" : "demo")
  )
    .trim()
    .toLowerCase();

  if (!secretKey) {
    const error = new Error("Stripe is not configured on the server.");
    error.status = 503;
    throw error;
  }

  const expectedPrefix =
    mode === "demo"
      ? "sk_test_"
      : mode === "live"
        ? "sk_live_"
        : null;

  if (!expectedPrefix) {
    const error = new Error("STRIPE_MODE must be set to demo or live.");
    error.status = 503;
    throw error;
  }

  if (!secretKey.startsWith(expectedPrefix)) {
    console.error("Stripe key mode mismatch:", {
      mode,
      keyPrefix: secretKey.slice(0, 8),
      keyLength: secretKey.length,
    });

    const error = new Error(
      mode === "demo"
        ? "Demo checkout requires a Stripe test secret key."
        : "Live checkout requires a Stripe live secret key."
    );
    error.status = 503;
    throw error;
  }

  return new Stripe(secretKey);
}

function getFrontendUrl() {
  const configuredUrl =
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL?.split(",")[0]?.trim();

  if (!configuredUrl) {
    throw new Error("FRONTEND_URL or CLIENT_URL must be configured.");
  }

  return configuredUrl.replace(/\/+$/, "");
}

function normalizeEmails(emails) {
  if (!Array.isArray(emails)) {
    return null;
  }

  return emails
    .map((email) => String(email || "").trim().toLowerCase())
    .filter(Boolean);
}

async function fulfillPaidPurchase(session, purchase) {
  if (
    session.amount_total !== purchase.totalAmount ||
    session.currency !== "cad"
  ) {
    const error = new Error("Payment amount does not match purchase.");
    error.status = 400;
    throw error;
  }

  const paidAt = new Date();
  const emails = [
    purchase.purchaserEmail,
    ...purchase.memberEmails,
  ];

  await Promise.all(
    emails.map((email) =>
      Entitlement.updateOne(
        { email },
        {
          $setOnInsert: {
            email,
            firebaseUid:
              email === purchase.purchaserEmail
                ? purchase.firebaseUid
                : null,
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
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : "",
        paidAt,
      },
    }
  );
}

router.get("/me", authenticateUser, async (req, res, next) => {
  try {
    const entitlement = await findUserEntitlement(req.user);

    return res.json({
      isPaid: Boolean(entitlement),
      plan: entitlement?.plan || null,
      email: req.user.email || "",
      emailVerificationRequired:
        !entitlement &&
        Boolean(req.user.email) &&
        req.user.email_verified !== true,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/confirm", authenticateUser, async (req, res, next) => {
  const sessionId = String(req.body?.sessionId || "").trim();

  if (!sessionId.startsWith("cs_")) {
    return res.status(400).json({
      message: "A valid Checkout Session ID is required.",
    });
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const purchase = await Purchase.findOne({
      stripeSessionId: session.id,
      firebaseUid: req.user.uid,
    });

    if (
      !purchase ||
      session.metadata?.purchaseId !== String(purchase._id)
    ) {
      return res.status(404).json({
        message: "Checkout session not found for this account.",
      });
    }

    if (session.payment_status !== "paid") {
      return res.json({ isPaid: false });
    }

    await fulfillPaidPurchase(session, purchase);

    return res.json({
      isPaid: true,
      plan: purchase.plan,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/checkout", authenticateUser, async (req, res, next) => {
  let purchase;

  try {
    const email = String(req.user.email || "").trim().toLowerCase();
    const planKey = req.body?.plan;
    const plan = PLANS[planKey];

    if (!email) {
      return res.status(400).json({
        message: "Your signed-in account must have an email address.",
      });
    }

    if (!plan) {
      return res.status(400).json({
        message: "Choose a valid plan.",
      });
    }

    const memberEmails =
      planKey === "group5"
        ? normalizeEmails(req.body?.memberEmails)
        : [];

    if (
      planKey === "group5" &&
      (!memberEmails || memberEmails.length !== 4)
    ) {
      return res.status(400).json({
        message: "Enter four additional email addresses for the group plan.",
      });
    }

    if (
      memberEmails.includes(email) ||
      new Set(memberEmails).size !== memberEmails.length ||
      memberEmails.some((memberEmail) =>
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberEmail)
      )
    ) {
      return res.status(400).json({
        message:
          "Group emails must be valid, unique, and different from your account email.",
      });
    }

    const purchaserEntitlement = await findUserEntitlement(req.user);

    if (purchaserEntitlement) {
      return res.status(409).json({
        code: "ALREADY_PAID",
        message: "This account already has full access.",
      });
    }

    const allEmails = [email, ...memberEmails];
    const existingSeats = await Entitlement.find({
      email: { $in: allEmails },
    }).select("email");

    if (existingSeats.length > 0) {
      return res.status(409).json({
        message:
          "One or more group email addresses already have an active plan. Use different email addresses.",
      });
    }

    purchase = await Purchase.create({
      firebaseUid: req.user.uid,
      purchaserEmail: email,
      memberEmails,
      plan: planKey,
      totalAmount: plan.amount,
    });

    const frontendUrl = getFrontendUrl();
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      client_reference_id: String(purchase._id),
      metadata: {
        purchaseId: String(purchase._id),
      },
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
      success_url:
        `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment/cancelled`,
    });

    await Purchase.updateOne(
      { _id: purchase._id },
      { $set: { stripeSessionId: session.id } }
    );

    return res.status(201).json({
      checkoutUrl: session.url,
    });
  } catch (error) {
    if (purchase) {
      await Purchase.updateOne(
        { _id: purchase._id, status: "pending" },
        { $set: { status: "failed" } }
      ).catch((updateError) => {
        console.error("Failed to mark checkout purchase as failed:", updateError);
      });
    }

    if (error.status === 503) {
      return res.status(503).json({
        message: error.message,
      });
    }

    return next(error);
  }
});

async function handleStripeWebhook(req, res) {
  const signature = req.headers["stripe-signature"];

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send("Stripe webhook is not configured.");
  }

  let event;

  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error.message);
    return res.status(400).send("Invalid Stripe webhook signature.");
  }

  if (
    event.type !== "checkout.session.completed" &&
    event.type !== "checkout.session.async_payment_succeeded"
  ) {
    return res.json({ received: true });
  }

  const session = event.data.object;

  if (session.payment_status !== "paid") {
    return res.json({ received: true });
  }

  try {
    const purchase = await Purchase.findOne({
      _id: session.metadata?.purchaseId,
      stripeSessionId: session.id,
    });

    if (!purchase) {
      console.error("Stripe payment has no matching purchase:", session.id);
      return res.status(404).send("Purchase not found.");
    }

    await fulfillPaidPurchase(session, purchase);

    return res.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    if (error.status === 400) {
      return res.status(400).send(error.message);
    }
    return res.status(500).send("Webhook processing failed.");
  }
}

router.handleStripeWebhook = handleStripeWebhook;

module.exports = router;
