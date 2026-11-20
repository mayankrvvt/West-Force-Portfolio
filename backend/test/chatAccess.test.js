import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { stubGeminiFetch } from "./helpers/gemini.js";
import { startMongo, stopMongo } from "./helpers/mongo";

// Signed-in chat needs a paid plan; paid users do not use the guest daily cap.
process.env.CHAT_ANON_DAILY_CAP = "0";

let app;
let fetchMock;

beforeAll(async () => {
  testUsers.set("token-free", { uid: "uid-free", email: "free@example.com" });
  testUsers.set("token-paid", { uid: "uid-paid", email: "paid@example.com" });
  const mongoose = await startMongo();
  await mongoose.connection.collection("entitlements").insertOne({
    email: "paid@example.com",
    firebaseUid: "uid-paid",
    plan: "solo",
    purchaseId: new mongoose.Types.ObjectId(),
    grantedAt: new Date(),
  });
  fetchMock = stubGeminiFetch();
  app = await loadApp();
});

afterAll(async () => {
  vi.unstubAllGlobals();
  testUsers.clear();
  delete process.env.CHAT_ANON_DAILY_CAP;
  await stopMongo();
});

const chat = (token) => {
  const req = request(app).post("/api/chat").set("X-Forwarded-For", "198.51.100.60");
  return (token ? req.set("Authorization", `Bearer ${token}`) : req).send({ message: "Hi" });
};

describe("chat access", () => {
  test("guest is blocked by the (zero) guest cap", async () => {
    const res = await chat();
    expect(res.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("signed in without a plan -> 402 PAYMENT_REQUIRED", async () => {
    const res = await chat("token-free");
    expect(res.status).toBe(402);
    expect(res.body.code).toBe("PAYMENT_REQUIRED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("paid user -> 200, guest cap does not apply", async () => {
    const res = await chat("token-paid");
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
