import crypto from "node:crypto";
import express from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const PIN = "4321";

let app;
let mongoose;
let Portfolio;
let PortfolioEvent;
let insights;
let visitor;
let counter = 0;

function hashPinV1(pin) {
  return crypto
    .createHash("sha256")
    .update(`${process.env.DOCUMENT_ACCESS_SECRET}:${pin}`)
    .digest("hex");
}

/** A user and a portfolio. Returns the owner's token, slug and portfolio. */
async function createPortfolio({ status = "published", protection, documents = [] } = {}) {
  counter += 1;
  const uid = `insights-uid-${counter}`;
  const token = `insights-token-${counter}`;
  const slug = `insights-${counter}`;
  testUsers.set(token, { uid, email: `${uid}@example.com` });

  const user = await mongoose.model("User").create({ firebaseUid: uid, email: `${uid}@example.com` });
  const portfolio = await Portfolio.create({
    userId: user._id,
    slug,
    status,
    documents,
    ...(protection ? { documentProtection: protection } : {}),
  });

  return { token, slug, portfolio };
}

function sendView(slug, { ip = "203.0.113.10", ua = BROWSER_UA, token } = {}) {
  const req = request(app)
    .post(`/api/insights/portfolios/${slug}/view`)
    .set("X-Forwarded-For", ip)
    .set("User-Agent", ua);
  return token ? req.set("Authorization", `Bearer ${token}`) : req;
}

function eventsFor(portfolio, extra = {}) {
  return PortfolioEvent.find({ portfolioId: portfolio._id, ...extra }).lean();
}

beforeAll(async () => {
  mongoose = await startMongo();
  const fullApp = await loadApp();
  // Loaded after loadApp() so the Firebase mock is in place.
  const insightsRoutes = (await import("../src/modules/insights/routes")).default;
  const { errorHandler } = await import("../src/lib/errors");
  Portfolio = (await import("../src/modules/portfolios/model")).default;
  PortfolioEvent = (await import("../src/modules/insights/model")).default;
  insights = await import("../src/modules/insights/service");
  visitor = await import("../src/modules/insights/visitor");
  await PortfolioEvent.init();

  // app.ts does not mount the router yet, so mount it here in front of the real app.
  const testApp = express();
  testApp.set("trust proxy", 2);
  testApp.use(express.json());
  testApp.use("/api/insights", insightsRoutes);
  testApp.use("/api/insights", errorHandler);
  testApp.use(fullApp);
  app = testApp;
});

afterAll(async () => {
  await stopMongo();
});

beforeEach(async () => {
  await PortfolioEvent.deleteMany({});
});

describe("view beacon", () => {
  test("stores a daily hash only, never the raw IP or user agent", async () => {
    const { slug, portfolio } = await createPortfolio();

    const res = await sendView(slug, { ip: "198.51.100.77" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, recorded: true });

    const stored = await eventsFor(portfolio);
    expect(stored).toHaveLength(1);
    const text = JSON.stringify(await PortfolioEvent.find({}).lean());
    expect(text).not.toContain("198.51.100.77");
    expect(text).not.toContain("Safari");
    expect(stored[0].visitorHash).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.keys(stored[0]).sort()).toEqual(
      ["_id", "createdAt", "day", "documentId", "documentName", "portfolioId", "type", "visitorHash"]
    );
  });

  test("the same visitor counts once a day, and again the next day", async () => {
    const { slug, portfolio } = await createPortfolio();

    expect((await sendView(slug)).body.recorded).toBe(true);
    expect((await sendView(slug)).body.recorded).toBe(false);
    expect(await eventsFor(portfolio)).toHaveLength(1);

    // Another visitor on the same day counts.
    expect((await sendView(slug, { ip: "203.0.113.11" })).body.recorded).toBe(true);

    const tomorrow = new Date(Date.now() + 86_400_000);
    const again = await insights.recordEvent({
      portfolioId: portfolio._id,
      type: "view",
      ip: "203.0.113.10",
      userAgent: BROWSER_UA,
      now: tomorrow,
    });
    expect(again).toBe(true);
    expect(await eventsFor(portfolio, { type: "view" })).toHaveLength(3);

    const today = visitor.utcDay();
    const input = { portfolioId: String(portfolio._id), ip: "203.0.113.10", userAgent: BROWSER_UA };
    expect(visitor.hashVisitor({ ...input, day: today })).not.toBe(
      visitor.hashVisitor({ ...input, day: visitor.utcDay(tomorrow) })
    );
  });

  test("bot and empty user agents are ignored", async () => {
    const { slug, portfolio } = await createPortfolio();

    const res = await sendView(slug, { ua: "Mozilla/5.0 (compatible; Googlebot/2.1)" });
    expect(res.status).toBe(200);
    expect(res.body.recorded).toBe(false);
    expect(await eventsFor(portfolio)).toHaveLength(0);

    expect(visitor.isBot("")).toBe(true);
    expect(visitor.isBot(undefined)).toBe(true);
    expect(visitor.isBot("curl/8.4.0")).toBe(true);
    expect(visitor.isBot(BROWSER_UA)).toBe(false);
  });

  test("the owner's own token is not counted; another user's token is", async () => {
    const { slug, token, portfolio } = await createPortfolio();
    const other = await createPortfolio();

    const own = await sendView(slug, { token });
    expect(own.body.recorded).toBe(false);
    expect(await eventsFor(portfolio)).toHaveLength(0);

    const someoneElse = await sendView(slug, { token: other.token });
    expect(someoneElse.body.recorded).toBe(true);

    const badToken = await sendView(slug, { token: "not-a-real-token", ip: "203.0.113.12" });
    expect(badToken.body.recorded).toBe(true);
  });

  test("an unpublished or unknown portfolio is a 404", async () => {
    const { slug, portfolio } = await createPortfolio({ status: "draft" });

    expect((await sendView(slug)).status).toBe(404);
    expect((await sendView("no-such-portfolio")).status).toBe(404);
    expect(await eventsFor(portfolio)).toHaveLength(0);
  });
});

describe("documents", () => {
  test("the right PIN records an unlock; a wrong PIN records nothing", async () => {
    const { slug, portfolio } = await createPortfolio({
      protection: { enabled: true, pinHash: hashPinV1(PIN) },
    });

    const unlock = (pin, ip) =>
      request(app)
        .post(`/api/portfolios/${slug}/unlock-documents`)
        .set("X-Forwarded-For", ip)
        .set("User-Agent", BROWSER_UA)
        .send({ pin });

    expect((await unlock("0000", "203.0.113.30")).status).toBe(401);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(await eventsFor(portfolio)).toHaveLength(0);

    expect((await unlock(PIN, "203.0.113.31")).status).toBe(200);
    await vi.waitFor(async () => {
      expect(await eventsFor(portfolio, { type: "unlock" })).toHaveLength(1);
    });
    expect(await eventsFor(portfolio)).toHaveLength(1);
  });

  test("a download records its documentId and name", async () => {
    const { slug, portfolio } = await createPortfolio({
      documents: [{ name: "First aid certificate.pdf", type: "certificate", fileUrl: "https://example.com/first-aid.pdf" }],
    });
    const documentId = String(portfolio.documents[0]._id);

    const res = await request(app)
      .get(`/api/portfolios/${slug}/documents/${documentId}`)
      .set("X-Forwarded-For", "203.0.113.40")
      .set("User-Agent", BROWSER_UA);
    expect(res.status).toBe(302);

    await vi.waitFor(async () => {
      const [event] = await eventsFor(portfolio, { type: "document" });
      expect(event).toMatchObject({ documentId, documentName: "First aid certificate.pdf" });
    });
  });
});

describe("GET /api/insights/me", () => {
  test("shows only the caller's data and fills empty days with zeros", async () => {
    const mine = await createPortfolio({
      documents: [{ name: "Police check.pdf", fileUrl: "https://example.com/police.pdf" }],
    });
    const theirs = await createPortfolio();
    const documentId = String(mine.portfolio.documents[0]._id);

    await sendView(mine.slug, { ip: "203.0.113.50" });
    await sendView(mine.slug, { ip: "203.0.113.51" });
    await insights.recordEvent({
      portfolioId: mine.portfolio._id,
      type: "document",
      documentId,
      documentName: "Police check.pdf",
      ip: "203.0.113.50",
      userAgent: BROWSER_UA,
    });
    await sendView(theirs.slug, { ip: "203.0.113.52" });
    await sendView(theirs.slug, { ip: "203.0.113.53" });
    await sendView(theirs.slug, { ip: "203.0.113.54" });

    const res = await request(app)
      .get("/api/insights/me?days=7")
      .set("Authorization", `Bearer ${mine.token}`);

    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({ views: 2, uniqueVisitors: 2, unlocks: 0, documentOpens: 1 });
    expect(res.body.daily).toHaveLength(7);
    expect(res.body.daily.at(-1)).toEqual({ day: visitor.utcDay(), views: 2, unlocks: 0 });
    expect(res.body.daily.slice(0, 6).every((row) => row.views === 0 && row.unlocks === 0)).toBe(true);
    expect(res.body.documents).toEqual([
      expect.objectContaining({ documentId, name: "Police check.pdf", opens: 1 }),
    ]);
    expect(res.body.recent).toHaveLength(3);
    expect(res.body.recent.map((item) => item.type).sort()).toEqual(["document", "view", "view"]);
    expect(JSON.stringify(res.body)).not.toContain("visitorHash");
  });

  test("days is clamped to 1–90 and a user with no portfolio gets zeros", async () => {
    const { token } = await createPortfolio();

    const big = await request(app).get("/api/insights/me?days=500").set("Authorization", `Bearer ${token}`);
    expect(big.body.daily).toHaveLength(90);

    const small = await request(app).get("/api/insights/me?days=0").set("Authorization", `Bearer ${token}`);
    expect(small.body.daily).toHaveLength(1);

    const junk = await request(app).get("/api/insights/me?days=abc").set("Authorization", `Bearer ${token}`);
    expect(junk.body.daily).toHaveLength(30);

    testUsers.set("insights-no-portfolio", { uid: "insights-nobody" });
    const none = await request(app).get("/api/insights/me").set("Authorization", "Bearer insights-no-portfolio");
    expect(none.status).toBe(200);
    expect(none.body.totals).toEqual({ views: 0, uniqueVisitors: 0, unlocks: 0, documentOpens: 0 });
  });

  test("needs a token", async () => {
    expect((await request(app).get("/api/insights/me")).status).toBe(401);
  });
});

describe("model and config", () => {
  test("the unique index and the 400-day TTL exist", async () => {
    const indexes = await PortfolioEvent.collection.indexes();

    expect(
      indexes.some(
        (index) =>
          index.unique &&
          JSON.stringify(index.key) ===
            JSON.stringify({ portfolioId: 1, type: 1, day: 1, visitorHash: 1, documentId: 1 })
      )
    ).toBe(true);
    expect(
      indexes.some((index) => index.key.createdAt === 1 && index.expireAfterSeconds === 400 * 86400)
    ).toBe(true);
  });

  test("INSIGHTS_HASH_SECRET is required in production only", async () => {
    const { insightsHashSecret } = await import("../src/lib/config");

    expect(() => insightsHashSecret({ NODE_ENV: "production" })).toThrow(/INSIGHTS_HASH_SECRET/);
    expect(insightsHashSecret({ NODE_ENV: "production", INSIGHTS_HASH_SECRET: "x" })).toBe("x");
    expect(insightsHashSecret({ NODE_ENV: "development" })).toBeTruthy();
  });
});
