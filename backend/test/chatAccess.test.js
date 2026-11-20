import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { stubGeminiFetch } from "./helpers/gemini.js";
import { startMongo, stopMongo } from "./helpers/mongo";

// Signed-in users have their own daily caps (free and paid); the guest cap
// does not apply to them.
process.env.CHAT_ANON_DAILY_CAP = "0";

const FREE_MESSAGE = "You've used today's free messages. Please buy a plan to keep chatting.";
const PAID_MESSAGE = "You've reached today's limit. It resets tomorrow.";

let app;
let fetchMock;

beforeAll(async () => {
  testUsers.set("token-free", { uid: "uid-free", email: "free@example.com" });
  testUsers.set("token-free-2", { uid: "uid-free-2", email: "free2@example.com" });
  testUsers.set("token-paid", { uid: "uid-paid", email: "paid@example.com" });
  testUsers.set("token-paid-2", { uid: "uid-paid-2", email: "paid2@example.com" });
  const mongoose = await startMongo();
  for (const [email, firebaseUid] of [
    ["paid@example.com", "uid-paid"],
    ["paid2@example.com", "uid-paid-2"],
  ]) {
    await mongoose.connection.collection("entitlements").insertOne({
      email,
      firebaseUid,
      plan: "solo",
      purchaseId: new mongoose.Types.ObjectId(),
      grantedAt: new Date(),
    });
  }
  fetchMock = stubGeminiFetch();
  app = await loadApp();
});

afterAll(async () => {
  vi.unstubAllGlobals();
  testUsers.clear();
  delete process.env.CHAT_ANON_DAILY_CAP;
  await stopMongo();
});

// A new IP per call by default, so the 15/min per-IP limit never gets in the way.
let ipCounter = 0;
const chat = (token, ip = `198.51.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`) => {
  const req = request(app).post("/api/chat").set("X-Forwarded-For", ip);
  return (token ? req.set("Authorization", `Bearer ${token}`) : req).send({ message: "Hi" });
};

async function withEnv(values, run) {
  Object.assign(process.env, values);
  try {
    await run();
  } finally {
    for (const key of Object.keys(values)) delete process.env[key];
  }
}

describe("chat access", () => {
  test("guest is blocked by the (zero) guest cap", async () => {
    const res = await chat();
    expect(res.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a bad token -> 401", async () => {
    const res = await chat("token-unknown");
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("signed in without a plan can chat 30 times a day (default), then 429 CHAT_LIMIT_FREE", async () => {
    for (let i = 0; i < 30; i += 1) {
      expect((await chat("token-free")).status).toBe(200);
    }

    const blocked = await chat("token-free");
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("CHAT_LIMIT_FREE");
    expect(blocked.body.message).toBe(FREE_MESSAGE);
    expect(fetchMock).toHaveBeenCalledTimes(30);
  });

  test("paid user -> 200, guest cap does not apply", async () => {
    const res = await chat("token-paid");
    expect(res.status).toBe(200);
  });

  test("paid user passes the free limit and stops at CHAT_PAID_DAILY with CHAT_LIMIT_PAID", async () => {
    await withEnv({ CHAT_FREE_DAILY: "2", CHAT_PAID_DAILY: "4" }, async () => {
      for (let i = 0; i < 4; i += 1) {
        expect((await chat("token-paid-2")).status).toBe(200);
      }

      const blocked = await chat("token-paid-2");
      expect(blocked.status).toBe(429);
      expect(blocked.body.code).toBe("CHAT_LIMIT_PAID");
      expect(blocked.body.message).toBe(PAID_MESSAGE);
    });
  });

  test("a failed Gemini call does not use up a signed-in user's slot", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await withEnv({ CHAT_FREE_DAILY: "1" }, async () => {
      fetchMock.mockRejectedValueOnce(
        new DOMException("The operation was aborted due to timeout", "TimeoutError")
      );

      expect((await chat("token-free-2")).status).toBe(504);
      expect((await chat("token-free-2")).status).toBe(200);
      expect((await chat("token-free-2")).body.code).toBe("CHAT_LIMIT_FREE");
    });
  });
});
