import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";
import { mockStripe, realWebhooks, stripeCalls } from "./helpers/stripe.js";

// Characterization tests: pin the current /api/payments behaviour.
// Stripe and Firebase are fakes; MongoDB is in-memory.
const WEBHOOK_SECRET = "whsec_test_fake_secret";

let app;
let mongoose;
let Purchase;
let Entitlement;
let userCounter = 0;

function newUser(overrides = {}) {
  userCounter += 1;
  const token = `token-pay-${userCounter}`;
  const user = {
    uid: `uid-pay-${userCounter}`,
    email: `payer${userCounter}@example.com`,
    email_verified: true,
    ...overrides,
  };
  testUsers.set(token, user);
  return { token, user };
}

function as(token, req) {
  return req.set("Authorization", `Bearer ${token}`);
}

beforeAll(async () => {
  mockStripe();
  mongoose = await startMongo();
  app = await loadApp();
  Purchase = mongoose.model("Purchase");
  Entitlement = mongoose.model("Entitlement");
});

afterAll(async () => {
  testUsers.clear();
  await stopMongo();
});

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_fake_key";
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  stripeCalls.create.mockReset();
  stripeCalls.retrieve.mockReset();
});

afterEach(() => {
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_MODE;
  vi.restoreAllMocks();
});

async function grant(email, firebaseUid, plan = "solo") {
  return Entitlement.create({
    email,
    firebaseUid,
    plan,
    purchaseId: new mongoose.Types.ObjectId(),
    grantedAt: new Date(),
  });
}

describe("GET /api/payments/me", () => {
  test("requires auth", async () => {
    const res = await request(app).get("/api/payments/me");
    expect(res.status).toBe(401);
  });

  test("unpaid verified user", async () => {
    const { token, user } = newUser();
    const res = await as(token, request(app).get("/api/payments/me"));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      isPaid: false,
      plan: null,
      email: user.email,
      emailVerificationRequired: false,
    });
  });

  test("unpaid unverified user needs email verification", async () => {
    const { token } = newUser({ email_verified: false });
    const res = await as(token, request(app).get("/api/payments/me"));

    expect(res.body.isPaid).toBe(false);
    expect(res.body.emailVerificationRequired).toBe(true);
  });

  test("paid by firebase uid", async () => {
    const { token, user } = newUser();
    await grant(user.email, user.uid, "group5");

    const res = await as(token, request(app).get("/api/payments/me"));
    expect(res.body).toMatchObject({ isPaid: true, plan: "group5" });
  });

  test("verified email claims an unclaimed seat and links the uid", async () => {
    const { token, user } = newUser();
    await grant(user.email, null);

    const res = await as(token, request(app).get("/api/payments/me"));
    expect(res.body).toMatchObject({ isPaid: true, plan: "solo" });

    const seat = await Entitlement.findOne({ email: user.email });
    expect(seat.firebaseUid).toBe(user.uid);
  });

  test("unverified email does not claim a seat", async () => {
    const { token, user } = newUser({ email_verified: false });
    await grant(user.email, null);

    const res = await as(token, request(app).get("/api/payments/me"));
    expect(res.body.isPaid).toBe(false);
  });
});

describe("POST /api/payments/checkout", () => {
  function checkout(token, body) {
    return as(token, request(app).post("/api/payments/checkout").send(body));
  }

  test("account without email -> 400", async () => {
    const { token } = newUser({ email: undefined });
    const res = await checkout(token, { plan: "solo" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "Your signed-in account must have an email address."
    );
  });

  test("invalid plan -> 400", async () => {
    const { token } = newUser();
    const res = await checkout(token, { plan: "gold" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Choose a valid plan.");
  });

  test("group plan needs exactly four member emails -> 400", async () => {
    const { token } = newUser();
    const res = await checkout(token, {
      plan: "group5",
      memberEmails: ["a@x.com", "b@x.com", "c@x.com"],
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "Enter four additional email addresses for the group plan."
    );
  });

  test.each([
    ["duplicate", ["a@x.com", "a@x.com", "c@x.com", "d@x.com"]],
    ["invalid", ["a@x.com", "not-an-email", "c@x.com", "d@x.com"]],
    ["own email", ["SELF", "b@x.com", "c@x.com", "d@x.com"]],
  ])("group plan with %s member email -> 400", async (_label, emails) => {
    const { token, user } = newUser();
    const memberEmails = emails.map((e) => (e === "SELF" ? user.email : e));
    const res = await checkout(token, { plan: "group5", memberEmails });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(
      "Group emails must be valid, unique, and different from your account email."
    );
  });

  test("already paid -> 409 ALREADY_PAID", async () => {
    const { token, user } = newUser();
    await grant(user.email, user.uid);

    const res = await checkout(token, { plan: "solo" });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      code: "ALREADY_PAID",
      message: "This account already has full access.",
    });
  });

  test("a member email already has a seat -> 409", async () => {
    const { token } = newUser();
    await grant("taken@x.com", null);

    const res = await checkout(token, {
      plan: "group5",
      memberEmails: ["taken@x.com", "b@x.com", "c@x.com", "d@x.com"],
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe(
      "One or more group email addresses already have an active plan. Use different email addresses."
    );
  });

  test("solo plan creates a pending purchase and a Stripe session -> 201", async () => {
    const { token, user } = newUser();
    stripeCalls.create.mockResolvedValueOnce({
      id: "cs_test_solo_1",
      url: "https://checkout.stripe.test/solo",
    });

    const res = await checkout(token, { plan: "solo", memberEmails: ["ignored@x.com"] });

    expect(res.status).toBe(201);
    expect(res.body.checkoutUrl).toBe("https://checkout.stripe.test/solo");

    const purchase = await Purchase.findOne({ firebaseUid: user.uid });
    expect(purchase).toMatchObject({
      purchaserEmail: user.email,
      plan: "solo",
      totalAmount: 99900,
      status: "pending",
      stripeSessionId: "cs_test_solo_1",
    });
    expect(purchase.memberEmails).toEqual([]);

    expect(stripeCalls.constructorArgs.at(-1)[0]).toBe("sk_test_fake_key");
    const args = stripeCalls.create.mock.calls[0][0];
    expect(args).toMatchObject({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: String(purchase._id),
      metadata: { purchaseId: String(purchase._id) },
      success_url:
        "http://localhost:5173/payment/success?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:5173/payment/cancelled",
    });
    expect(args.line_items[0]).toMatchObject({
      quantity: 1,
      price_data: {
        currency: "cad",
        unit_amount: 99900,
        product_data: { name: "WestForce Solo" },
      },
    });
  });

  test("group plan lowercases member emails and charges 349500", async () => {
    const { token, user } = newUser();
    stripeCalls.create.mockResolvedValueOnce({
      id: "cs_test_group_1",
      url: "https://checkout.stripe.test/group",
    });

    const res = await checkout(token, {
      plan: "group5",
      memberEmails: [" M1@X.com ", "m2@x.com", "m3@x.com", "m4@x.com"],
    });

    expect(res.status).toBe(201);
    const purchase = await Purchase.findOne({ firebaseUid: user.uid });
    expect(purchase.memberEmails).toEqual([
      "m1@x.com",
      "m2@x.com",
      "m3@x.com",
      "m4@x.com",
    ]);
    expect(purchase.totalAmount).toBe(349500);
    expect(
      stripeCalls.create.mock.calls[0][0].line_items[0].price_data.product_data.name
    ).toBe("WestForce Group of 5");
  });

  test("Stripe not configured -> 503 and the purchase is marked failed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.STRIPE_SECRET_KEY;
    const { token, user } = newUser();

    const res = await checkout(token, { plan: "solo" });

    expect(res.status).toBe(503);
    expect(res.body.message).toBe("Stripe is not configured on the server.");
    const purchase = await Purchase.findOne({ firebaseUid: user.uid });
    expect(purchase.status).toBe("failed");
    expect(stripeCalls.create).not.toHaveBeenCalled();
  });

  test("demo mode with a live key -> 503", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.STRIPE_SECRET_KEY = "sk_live_fake_key";
    const { token } = newUser();

    const res = await checkout(token, { plan: "solo" });

    expect(res.status).toBe(503);
    expect(res.body.message).toBe(
      "Demo checkout requires a Stripe test secret key."
    );
  });

  test("live mode with a test key -> 503", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.STRIPE_MODE = "live";
    const { token } = newUser();

    const res = await checkout(token, { plan: "solo" });

    expect(res.status).toBe(503);
    expect(res.body.message).toBe(
      "Live checkout requires a Stripe live secret key."
    );
  });

  test("unknown STRIPE_MODE -> 503", async () => {
    process.env.STRIPE_MODE = "sandbox";
    const { token } = newUser();

    const res = await checkout(token, { plan: "solo" });

    expect(res.status).toBe(503);
    expect(res.body.message).toBe("STRIPE_MODE must be set to demo or live.");
  });

  test("Stripe API error -> 500 generic message and purchase failed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { token, user } = newUser();
    stripeCalls.create.mockRejectedValueOnce(new Error("stripe exploded secret"));

    const res = await checkout(token, { plan: "solo" });

    expect(res.status).toBe(500);
    expect(res.body).toMatchObject({
      success: false,
      message: "Internal server error.",
    });
    expect(JSON.stringify(res.body)).not.toContain("stripe exploded secret");
    const purchase = await Purchase.findOne({ firebaseUid: user.uid });
    expect(purchase.status).toBe("failed");
  });
});

async function pendingPurchase(user, overrides = {}) {
  const purchase = await Purchase.create({
    firebaseUid: user.uid,
    purchaserEmail: user.email,
    memberEmails: [],
    plan: "solo",
    totalAmount: 99900,
    ...overrides,
  });
  const stripeSessionId = overrides.stripeSessionId || `cs_test_${purchase._id}`;
  purchase.stripeSessionId = stripeSessionId;
  await purchase.save();
  return purchase;
}

function paidSession(purchase, overrides = {}) {
  return {
    id: purchase.stripeSessionId,
    payment_status: "paid",
    amount_total: purchase.totalAmount,
    currency: "cad",
    payment_intent: "pi_test_123",
    metadata: { purchaseId: String(purchase._id) },
    ...overrides,
  };
}

describe("POST /api/payments/confirm", () => {
  function confirm(token, body) {
    return as(token, request(app).post("/api/payments/confirm").send(body));
  }

  test.each([[{}], [{ sessionId: "pi_123" }], [{ sessionId: "  " }]])(
    "invalid session id %j -> 400",
    async (body) => {
      const { token } = newUser();
      const res = await confirm(token, body);
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("A valid Checkout Session ID is required.");
      expect(stripeCalls.retrieve).not.toHaveBeenCalled();
    }
  );

  test("session of another account -> 404", async () => {
    const owner = newUser();
    const other = newUser();
    const purchase = await pendingPurchase(owner.user);
    stripeCalls.retrieve.mockResolvedValueOnce(paidSession(purchase));

    const res = await confirm(other.token, { sessionId: purchase.stripeSessionId });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Checkout session not found for this account.");
  });

  test("metadata purchaseId mismatch -> 404", async () => {
    const { token, user } = newUser();
    const purchase = await pendingPurchase(user);
    stripeCalls.retrieve.mockResolvedValueOnce(
      paidSession(purchase, { metadata: { purchaseId: "other" } })
    );

    const res = await confirm(token, { sessionId: purchase.stripeSessionId });
    expect(res.status).toBe(404);
  });

  test("unpaid session -> { isPaid: false }", async () => {
    const { token, user } = newUser();
    const purchase = await pendingPurchase(user);
    stripeCalls.retrieve.mockResolvedValueOnce(
      paidSession(purchase, { payment_status: "unpaid" })
    );

    const res = await confirm(token, { sessionId: ` ${purchase.stripeSessionId} ` });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ isPaid: false });
    expect(stripeCalls.retrieve).toHaveBeenCalledWith(purchase.stripeSessionId);
  });

  test("paid group session grants seats to purchaser and members", async () => {
    const { token, user } = newUser();
    const purchase = await pendingPurchase(user, {
      plan: "group5",
      totalAmount: 349500,
      memberEmails: ["g1@x.com", "g2@x.com", "g3@x.com", "g4@x.com"],
    });
    stripeCalls.retrieve.mockResolvedValueOnce(paidSession(purchase));

    const res = await confirm(token, { sessionId: purchase.stripeSessionId });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ isPaid: true, plan: "group5" });

    const seats = await Entitlement.find({ purchaseId: purchase._id });
    expect(seats).toHaveLength(5);
    const own = seats.find((s) => s.email === user.email);
    expect(own.firebaseUid).toBe(user.uid);
    expect(seats.filter((s) => s.firebaseUid === null)).toHaveLength(4);

    const saved = await Purchase.findById(purchase._id);
    expect(saved.status).toBe("paid");
    expect(saved.stripePaymentIntentId).toBe("pi_test_123");
    expect(saved.paidAt).toBeInstanceOf(Date);
  });

  test("amount mismatch -> 400 and nothing granted", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { token, user } = newUser();
    const purchase = await pendingPurchase(user);
    stripeCalls.retrieve.mockResolvedValueOnce(
      paidSession(purchase, { amount_total: 100 })
    );

    const res = await confirm(token, { sessionId: purchase.stripeSessionId });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      message: "Payment amount does not match purchase.",
    });
    expect(await Entitlement.countDocuments({ purchaseId: purchase._id })).toBe(0);
  });
});

describe("POST /api/payments/webhook", () => {
  function sendEvent(event, { secret = WEBHOOK_SECRET, signature } = {}) {
    const payload = JSON.stringify(event);
    const header =
      signature ??
      realWebhooks.generateTestHeaderString({ payload, secret });
    return request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .set("Stripe-Signature", header)
      .send(payload);
  }

  function completed(session, type = "checkout.session.completed") {
    return { id: "evt_test", type, data: { object: session } };
  }

  test("webhook secret not configured -> 503 text", async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await sendEvent({ type: "x" });
    expect(res.status).toBe(503);
    expect(res.text).toBe("Stripe webhook is not configured.");
  });

  test("bad signature -> 400 text", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await sendEvent({ type: "x" }, { secret: "whsec_wrong" });
    expect(res.status).toBe(400);
    expect(res.text).toBe("Invalid Stripe webhook signature.");
  });

  test("missing signature -> 400 text", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(app)
      .post("/api/payments/webhook")
      .set("Content-Type", "application/json")
      .send("{}");
    expect(res.status).toBe(400);
    expect(res.text).toBe("Invalid Stripe webhook signature.");
  });

  test("other event types are acknowledged", async () => {
    const res = await sendEvent({ id: "evt", type: "invoice.paid", data: { object: {} } });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  test("unpaid completed session is acknowledged without granting", async () => {
    const { user } = newUser();
    const purchase = await pendingPurchase(user);

    const res = await sendEvent(
      completed(paidSession(purchase, { payment_status: "unpaid" }))
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(await Entitlement.countDocuments({ purchaseId: purchase._id })).toBe(0);
  });

  test.each([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
  ])("%s with a paid session grants access", async (type) => {
    const { user } = newUser();
    const purchase = await pendingPurchase(user);

    const res = await sendEvent(completed(paidSession(purchase), type));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    const seat = await Entitlement.findOne({ email: user.email });
    expect(seat).toMatchObject({ firebaseUid: user.uid, plan: "solo" });
    expect((await Purchase.findById(purchase._id)).status).toBe("paid");
  });

  test("replayed webhook is idempotent", async () => {
    const { user } = newUser();
    const purchase = await pendingPurchase(user);
    const event = completed(paidSession(purchase));

    expect((await sendEvent(event)).status).toBe(200);
    expect((await sendEvent(event)).status).toBe(200);
    expect(await Entitlement.countDocuments({ email: user.email })).toBe(1);
  });

  test("no matching purchase -> 404 text", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await sendEvent(
      completed({
        id: "cs_test_unknown",
        payment_status: "paid",
        amount_total: 99900,
        currency: "cad",
        metadata: { purchaseId: String(new mongoose.Types.ObjectId()) },
      })
    );
    expect(res.status).toBe(404);
    expect(res.text).toBe("Purchase not found.");
  });

  test("amount mismatch -> 400 text", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { user } = newUser();
    const purchase = await pendingPurchase(user);

    const res = await sendEvent(
      completed(paidSession(purchase, { currency: "usd" }))
    );

    expect(res.status).toBe(400);
    expect(res.text).toBe("Payment amount does not match purchase.");
  });

  test("database failure -> 500 text", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { user } = newUser();
    const purchase = await pendingPurchase(user);
    vi.spyOn(Purchase, "findOne").mockRejectedValueOnce(new Error("db down"));

    const res = await sendEvent(completed(paidSession(purchase)));

    expect(res.status).toBe(500);
    expect(res.text).toBe("Webhook processing failed.");
  });
});
