import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

const PIN = "4321";
const WRONG_PIN = "0000";
// Last X-Forwarded-For entry is the Vercel edge IP (added by Render).
const VERCEL_IP = "198.51.100.250";

let app;
let mongoose;
let Portfolio;
let slugCounter = 0;

function hashPin(pin) {
  return crypto
    .createHash("sha256")
    .update(`${process.env.DOCUMENT_ACCESS_SECRET}:${pin}`)
    .digest("hex");
}

async function createProtectedPortfolio() {
  slugCounter += 1;
  const slug = `pin-test-${slugCounter}`;

  await Portfolio.create({
    userId: new mongoose.Types.ObjectId(),
    slug,
    status: "published",
    documentProtection: { enabled: true, pinHash: hashPin(PIN) },
  });

  return slug;
}

function unlock(slug, pin, xff, server = app) {
  return request(server)
    .post(`/api/portfolios/${slug}/unlock-documents`)
    .set("X-Forwarded-For", xff)
    .send({ pin });
}

// Simulates a server restart: reloads every backend module, keeps MongoDB.
async function restartApp() {
  vi.resetModules();
  mongoose.deleteModel(/.+/);
  const freshApp = await loadApp();
  Portfolio = (await import("../src/modules/portfolios/model")).default;
  return freshApp;
}

beforeAll(async () => {
  mongoose = await startMongo();
  app = await loadApp();
  Portfolio = (await import("../src/modules/portfolios/model")).default;
});

afterAll(async () => {
  await stopMongo();
});

describe("document PIN unlock", () => {
  test("correct PIN unlocks and sets the access cookie", async () => {
    const slug = await createProtectedPortfolio();

    const res = await unlock(slug, PIN, "203.0.113.1");

    expect(res.status).toBe(200);
    expect(res.body.unlocked).toBe(true);
    expect(res.headers["set-cookie"]?.[0]).toContain(
      `westforce_document_access_${slug}=`
    );
  });

  test("per-IP limit: spoofed X-Forwarded-For values do not reset it", async () => {
    const slug = await createProtectedPortfolio();

    for (let i = 0; i < 5; i += 1) {
      const res = await unlock(
        slug,
        WRONG_PIN,
        `10.0.${i}.1, 203.0.113.7, ${VERCEL_IP}`
      );
      expect(res.status).toBe(401);
    }

    const blocked = await unlock(
      slug,
      WRONG_PIN,
      `10.99.99.99, 203.0.113.7, ${VERCEL_IP}`
    );
    expect(blocked.status).toBe(429);
  });

  test("race: 20 parallel wrong tries from one IP, at most 5 are checked against the PIN", async () => {
    const slug = await createProtectedPortfolio();

    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        unlock(slug, WRONG_PIN, "203.0.113.20")
      )
    );

    const checked = results.filter((res) => res.status === 401).length;
    const blocked = results.filter((res) => res.status === 429).length;

    expect(checked).toBeLessThanOrEqual(5);
    expect(checked + blocked).toBe(20);
  });

  test("race: parallel tries across IPs never check more than 30 PINs per portfolio", async () => {
    const slug = await createProtectedPortfolio();

    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        unlock(slug, WRONG_PIN, `198.18.0.${i + 1}`)
      )
    );

    const checked = results.filter((res) => res.status === 401).length;
    expect(checked).toBeLessThanOrEqual(30);
  });

  test("10 failed tries across IPs no longer lock out the real viewer", async () => {
    const slug = await createProtectedPortfolio();

    for (let i = 1; i <= 10; i += 1) {
      const res = await unlock(slug, WRONG_PIN, `198.51.100.${i}`);
      expect(res.status).toBe(401);
    }

    const ok = await unlock(slug, PIN, "198.51.100.200");
    expect(ok.status).toBe(200);
  });

  test("tries blocked by the per-IP limit do not count toward the portfolio lock", async () => {
    const slug = await createProtectedPortfolio();

    for (let i = 0; i < 40; i += 1) {
      await unlock(slug, WRONG_PIN, "203.0.113.40");
    }

    const ok = await unlock(slug, PIN, "203.0.113.41");
    expect(ok.status).toBe(200);
  });

  test("correct PIN clears this IP's counter", async () => {
    const slug = await createProtectedPortfolio();

    for (let i = 0; i < 4; i += 1) {
      expect((await unlock(slug, WRONG_PIN, "203.0.113.50")).status).toBe(401);
    }
    expect((await unlock(slug, PIN, "203.0.113.50")).status).toBe(200);

    const res = await unlock(slug, WRONG_PIN, "203.0.113.50");
    expect(res.status).toBe(401);
    expect(res.body.attemptsRemaining).toBe(4);
  });

  test("per-portfolio lockout: 30 failed tries across IPs lock everyone out for up to 60 min, even with the right PIN", async () => {
    const slug = await createProtectedPortfolio();

    for (let i = 1; i <= 30; i += 1) {
      const res = await unlock(slug, WRONG_PIN, `198.51.101.${i}`);
      expect(res.status).toBe(401);
    }

    const blocked = await unlock(slug, PIN, "198.51.101.200");
    expect(blocked.status).toBe(429);
    expect(blocked.body.retryAfter).toBeGreaterThan(15 * 60);
    expect(blocked.body.retryAfter).toBeLessThanOrEqual(60 * 60);
  });

  test("lockout is stored in MongoDB and survives a server restart", async () => {
    const slug = await createProtectedPortfolio();

    for (let i = 1; i <= 30; i += 1) {
      await unlock(slug, WRONG_PIN, `192.0.2.${i}`);
    }

    app = await restartApp();

    const blocked = await unlock(slug, PIN, "192.0.2.200");
    expect(blocked.status).toBe(429);
  });

  test("attempt records have a TTL index so MongoDB cleans them up", async () => {
    const PinAttempt = (await import("../src/modules/documents/model")).default;
    await PinAttempt.init();

    const indexes = await PinAttempt.collection.indexes();

    expect(
      indexes.some(
        (index) => index.key.expiresAt === 1 && index.expireAfterSeconds === 0
      )
    ).toBe(true);
  });

  test("failure counter is atomic under concurrent tries and restarts after the window", async () => {
    const PinAttempt = (await import("../src/modules/documents/model")).default;
    const key = "test:concurrent";
    const start = new Date("2026-01-01T00:00:00Z");

    const counts = await Promise.all(
      Array.from({ length: 10 }, () =>
        PinAttempt.recordFailure(key, 60_000, start)
      )
    );
    expect(Math.max(...counts)).toBe(10);

    const later = new Date(start.getTime() + 61_000);
    expect(await PinAttempt.findActive(key, later)).toBeNull();
    expect(await PinAttempt.recordFailure(key, 60_000, later)).toBe(1);
  });
});

describe("PIN formats and hash upgrade", () => {
  let ownerCounter = 0;

  // A signed-in owner with a published portfolio. Returns its token and slug.
  async function createOwner({ protection, documents = [] } = {}) {
    ownerCounter += 1;
    const token = `pin-owner-${ownerCounter}`;
    const uid = `pin-owner-uid-${ownerCounter}`;
    const slug = `pin-owner-${ownerCounter}`;
    testUsers.set(token, { uid, email: `${uid}@example.com` });

    const user = await mongoose.model("User").create({
      firebaseUid: uid,
      email: `${uid}@example.com`,
    });

    await Portfolio.create({
      userId: user._id,
      slug,
      status: "published",
      documents,
      ...(protection ? { documentProtection: protection } : {}),
    });

    return { token, slug };
  }

  async function storedProtection(slug) {
    const portfolio = await Portfolio.findOne({ slug }).select(
      "+documentProtection.pinHash"
    );
    return portfolio.documentProtection;
  }

  test("legacy 4-digit (v1) PIN unlocks, is rehashed to v2, and keeps working", async () => {
    const slug = await createProtectedPortfolio();

    const first = await unlock(slug, PIN, "203.0.113.60");
    expect(first.status).toBe(200);

    const stored = await storedProtection(slug);
    expect(stored.pinHashVersion).toBe(2);
    expect(stored.pinLength).toBe(4);
    expect(stored.pinHash.startsWith("scrypt$")).toBe(true);
    expect(stored.pinHash).not.toBe(hashPin(PIN));

    expect((await unlock(slug, PIN, "203.0.113.61")).status).toBe(200);
    expect((await unlock(slug, WRONG_PIN, "203.0.113.61")).status).toBe(401);
  });

  test("a wrong PIN does not rehash a legacy PIN", async () => {
    const slug = await createProtectedPortfolio();

    expect((await unlock(slug, WRONG_PIN, "203.0.113.62")).status).toBe(401);

    const stored = await storedProtection(slug);
    expect(stored.pinHash).toBe(hashPin(PIN));
    expect(stored.pinHashVersion ?? null).toBeNull();
  });

  test("a 6-digit PIN set by the owner is stored as v2 and unlocks", async () => {
    const { token, slug } = await createOwner();

    const set = await request(app)
      .put("/api/portfolios/me/document-protection")
      .set("Authorization", `Bearer ${token}`)
      .send({ enabled: true, pin: "123456" });
    expect(set.status).toBe(200);
    expect(set.body.documentProtection).toEqual({ enabled: true });

    const stored = await storedProtection(slug);
    expect(stored.pinHashVersion).toBe(2);
    expect(stored.pinLength).toBe(6);
    expect(stored.pinHash).not.toContain("123456");

    expect((await unlock(slug, "123456", "203.0.113.63")).status).toBe(200);
    expect((await unlock(slug, "654321", "203.0.113.63")).status).toBe(401);

    const me = await request(app)
      .get("/api/portfolios/me")
      .set("Authorization", `Bearer ${token}`);
    expect(me.body.portfolio.documentProtection).toEqual({ enabled: true, pinLength: 6 });

    const pub = await request(app).get(`/api/portfolios/${slug}`);
    expect(pub.body.portfolio.documentProtection).toEqual({ enabled: true, pinLength: 6 });
  });

  test("owner's /me shows pinLength 4 for a legacy PIN", async () => {
    const { token } = await createOwner({
      protection: { enabled: true, pinHash: hashPin(PIN) },
    });

    const me = await request(app)
      .get("/api/portfolios/me")
      .set("Authorization", `Bearer ${token}`);

    expect(me.body.portfolio.documentProtection).toEqual({ enabled: true, pinLength: 4 });
    expect(JSON.stringify(me.body)).not.toContain("pinHash");
  });

  test("setting a new 4-digit PIN is rejected", async () => {
    const { token } = await createOwner();

    const res = await request(app)
      .put("/api/portfolios/me/document-protection")
      .set("Authorization", `Bearer ${token}`)
      .send({ enabled: true, pin: "1234" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("PIN must contain exactly 6 digits.");
  });

  test.each(["12345", "1234567", "12a4", ""])(
    "unlock with PIN %j returns 400 and uses no try",
    async (pin) => {
      const slug = await createProtectedPortfolio();

      const res = await unlock(slug, pin, "203.0.113.64");
      expect(res.status).toBe(400);

      const wrong = await unlock(slug, WRONG_PIN, "203.0.113.64");
      expect(wrong.body.attemptsRemaining).toBe(4);
    }
  );

  test("GET /me/documents filters by type, case-insensitive", async () => {
    const { token } = await createOwner({
      documents: [
        { name: "AWS.pdf", type: "Certificate" },
        { name: "Degree.pdf", type: "certificate" },
        { name: "Letter.pdf", type: "Reference" },
      ],
    });

    const all = await request(app)
      .get("/api/portfolios/me/documents")
      .set("Authorization", `Bearer ${token}`);
    expect(all.status).toBe(200);
    expect(all.body.documents).toHaveLength(3);

    const certs = await request(app)
      .get("/api/portfolios/me/documents?type=certificate")
      .set("Authorization", `Bearer ${token}`);
    expect(certs.body.documents.map((d) => d.name)).toEqual(["AWS.pdf", "Degree.pdf"]);
  });

  test("GET /me/documents needs a token", async () => {
    const res = await request(app).get("/api/portfolios/me/documents");
    expect(res.status).toBe(401);
  });
});
