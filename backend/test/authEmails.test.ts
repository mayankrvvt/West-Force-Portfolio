import { inspect } from "node:util";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import type { Mongoose } from "mongoose";
import { authStub, loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

// Branded account emails (/api/auth). Firebase Admin is the test stub and
// Resend is always mocked. Two paths:
// - not live (the default, and always under NODE_ENV=test): the API tells the
//   frontend to use Firebase's own email, and Resend is never called;
// - live (NODE_ENV stubbed to production with fake mail settings): our
//   branded email goes through the mocked Resend client.
type SentEmail = { from: string; to: string; subject: string; html: string; text: string };
const resendSend = vi.hoisted(() => vi.fn<(payload: SentEmail) => Promise<unknown>>());
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));

import { logger } from "../src/lib/logger";

const CODE = "OOB-SECRET-777";
const FAKE_KEY = "re_fake_key_for_tests";
const firebaseLink = (mode: string) =>
  `https://westforce-test.firebaseapp.com/__/auth/action?mode=${mode}&oobCode=${CODE}&apiKey=fake&continueUrl=x`;

let app: Express;
let mongoose: Mongoose;
const newToken = "token-auth-new";
const verifiedToken = "token-auth-verified";

beforeAll(async () => {
  mongoose = await startMongo();
  app = await loadApp();
  testUsers.set(newToken, { uid: "uid-auth-new", email: "new.person@example.com", email_verified: false, name: "Emma Tremblay" });
  testUsers.set(verifiedToken, { uid: "uid-auth-verified", email: "done@example.com", email_verified: true });
  await request(app).post("/api/users").set("Authorization", `Bearer ${newToken}`).send({});
});

beforeEach(() => {
  resendSend.mockReset().mockResolvedValue({ data: { id: "email_1" }, error: null, headers: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

afterAll(async () => {
  testUsers.clear();
  await stopMongo();
});

function goLive(allowlist = "") {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("MAIL_MODE", "live");
  vi.stubEnv("RESEND_API_KEY", FAKE_KEY);
  vi.stubEnv("MAIL_FROM", "WestForce <hello@westforce.example>");
  vi.stubEnv("MAIL_ALLOWLIST", allowlist);
}

/** Spy on the app logger; text() is every log call so far. */
function watchLogs() {
  const spies = (["info", "warn", "error"] as const).map((level) => vi.spyOn(logger, level));
  // inspect copes with the circular req/res objects pino-http logs.
  return { text: () => inspect(spies.flatMap((spy) => spy.mock.calls), { depth: 8 }) };
}

const sentSubjects = () => resendSend.mock.calls.map(([payload]) => `${payload.subject} -> ${payload.to}`);

/** Response JSON, typed loosely for the checks below. */
const bodyOf = (res: request.Response) => res.body as Record<string, unknown>;

const resetFrom = (ip: string, body: object) =>
  request(app).post("/api/auth/password-reset").set("X-Forwarded-For", ip).send(body);
const asUser = (path: string, token: string) => request(app).post(path).set("Authorization", `Bearer ${token}`);

describe("mail not live: the frontend falls back to Firebase", () => {
  test("password reset: same answer for any email, fallback firebase, nothing generated or sent", async () => {
    const generate = vi.spyOn(authStub, "generatePasswordResetLink");

    const unknown = await resetFrom("203.0.113.10", { email: "nobody@example.com" });
    const known = await resetFrom("203.0.113.10", { email: "new.person@example.com" });

    expect(unknown.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    expect(known.body).toMatchObject({ delivered: false, fallback: "firebase" });
    expect(generate).not.toHaveBeenCalled();
    expect(resendSend).not.toHaveBeenCalled();
  });

  test("send verification: fallback firebase, nothing generated or sent", async () => {
    const generate = vi.spyOn(authStub, "generateEmailVerificationLink");

    const res = await asUser("/api/auth/send-verification", newToken);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ alreadyVerified: false, delivered: false, fallback: "firebase" });
    expect(generate).not.toHaveBeenCalled();
    expect(resendSend).not.toHaveBeenCalled();
  });

  test("MAIL_MODE=live under NODE_ENV=test still falls back and never calls Resend", async () => {
    vi.stubEnv("MAIL_MODE", "live");
    vi.stubEnv("RESEND_API_KEY", FAKE_KEY);
    vi.stubEnv("MAIL_FROM", "WestForce <hello@westforce.example>");

    const res = await resetFrom("203.0.113.11", { email: "new.person@example.com" });

    expect(bodyOf(res).fallback).toBe("firebase");
    expect(resendSend).not.toHaveBeenCalled();
  });

  test("verified email is stored, but the welcome is skipped and left for later", async () => {
    vi.spyOn(authStub, "getUser").mockResolvedValue({ uid: "uid-auth-new", emailVerified: true });

    const res = await asUser("/api/auth/email-verified", newToken);

    expect(bodyOf(res).verified).toBe(true);
    expect(resendSend).not.toHaveBeenCalled();
    const user = await mongoose.model("User").findOne({ firebaseUid: "uid-auth-new" }).lean<{ emailVerified: boolean; welcomeSentAt: Date | null }>();
    expect(user?.emailVerified).toBe(true);
    expect(user?.welcomeSentAt).toBeNull();
  });
});

describe("mail live (Resend mocked)", () => {
  test("password reset: same answer for known and unknown, only the known one is emailed, no link in logs", async () => {
    goLive();
    const logs = watchLogs();
    const generate = vi.spyOn(authStub, "generatePasswordResetLink").mockImplementation((email) =>
      email === "known@example.com"
        ? Promise.resolve(firebaseLink("resetPassword"))
        : Promise.reject(Object.assign(new Error("no user"), { code: "auth/email-not-found" }))
    );

    const unknown = await resetFrom("203.0.113.30", { email: "nobody@example.com" });
    const known = await resetFrom("203.0.113.30", { email: "  Known@Example.com " });

    expect(unknown.status).toBe(200);
    expect(known.body).toEqual(unknown.body);
    expect(known.body).toMatchObject({ delivered: true, fallback: null });
    expect(generate.mock.calls.map(([email]) => email).sort()).toEqual(["known@example.com", "nobody@example.com"]);
    expect(JSON.stringify(generate.mock.calls[0]?.[1])).toMatch(/^\{"url":"https?:\/\/[^"]+\/auth\/sign-in"\}$/);

    await vi.waitFor(() => expect(sentSubjects()).toEqual(["Reset your WestForce password -> known@example.com"]));
    const { html = "", text = "" } = resendSend.mock.calls[0]?.[0] ?? {};
    expect(text).toContain(`/auth/action?mode=resetPassword&oobCode=${CODE}`);
    expect(html).not.toContain("firebaseapp.com");
    expect(logs.text()).not.toContain(CODE);
    expect(logs.text()).not.toContain(FAKE_KEY);
    expect(logs.text()).not.toContain("known@example.com");
  });

  test("password reset: a Firebase failure still gives the same answer", async () => {
    goLive();
    vi.spyOn(authStub, "generatePasswordResetLink").mockRejectedValue(
      Object.assign(new Error("quota"), { code: "auth/internal-error" })
    );

    const res = await resetFrom("203.0.113.31", { email: "someone@example.com" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ delivered: true, fallback: null });
    expect(bodyOf(res).message).toMatch(/If an account uses that email/);
  });

  test("MAIL_ALLOWLIST: listed and unlisted addresses get the same answer; only the listed one is emailed", async () => {
    goLive("listed@example.com");
    const generate = vi.spyOn(authStub, "generatePasswordResetLink").mockResolvedValue(firebaseLink("resetPassword"));

    const listed = await resetFrom("203.0.113.32", { email: "listed@example.com" });
    const other = await resetFrom("203.0.113.32", { email: "unlisted@example.com" });

    expect(other.status).toBe(200);
    expect(other.body).toEqual(listed.body);
    expect(listed.body).toMatchObject({ delivered: true, fallback: null });
    await vi.waitFor(() => expect(sentSubjects()).toEqual(["Reset your WestForce password -> listed@example.com"]));
    expect(generate.mock.calls.map(([email]) => email)).toEqual(["listed@example.com"]);
  });

  test("password reset: at most 3 emails per address per hour, even from new IPs, with the same answer every time", async () => {
    goLive();
    vi.spyOn(authStub, "generatePasswordResetLink").mockResolvedValue(firebaseLink("resetPassword"));
    const floodSends = () => sentSubjects().filter((line) => line.endsWith("-> flood@example.com"));

    const answers: request.Response[] = [];
    for (let i = 1; i <= 4; i += 1) {
      // A new fake X-Forwarded-For each time, so the per IP limit never kicks in.
      answers.push(await resetFrom(`198.51.100.${i}`, { email: i % 2 ? " Flood@Example.com " : "flood@example.com" }));
    }

    expect(answers.map((res) => res.status)).toEqual([200, 200, 200, 200]);
    for (const res of answers) expect(res.body).toEqual(answers[0]?.body);

    const other = await resetFrom("198.51.100.9", { email: "someone.else@example.com" });
    expect(other.body).toEqual(answers[0]?.body);
    await vi.waitFor(() => expect(sentSubjects()).toContain("Reset your WestForce password -> someone.else@example.com"));
    expect(floodSends()).toHaveLength(3);
  });

  test("welcome email goes to the Firebase Auth address, never a different stored one", async () => {
    goLive();
    const { recordVerifiedEmail } = await import("../src/modules/auth/service.js");
    const now = new Date();
    await mongoose.model("User").collection.insertOne({
      firebaseUid: "uid-swapped",
      email: "victim@example.com",
      emailVerified: false,
      welcomeSentAt: null,
      createdAt: now,
      updatedAt: now,
    });
    vi.spyOn(authStub, "getUser").mockResolvedValue({ uid: "uid-swapped", email: "owner@example.com", emailVerified: true });

    expect(await recordVerifiedEmail("uid-swapped")).toBe(true);
    expect(sentSubjects()).toEqual(["Welcome to WestForce -> owner@example.com"]);
  });

  test("welcome email is not sent when Firebase says the address is not verified", async () => {
    goLive();
    const { recordVerifiedEmail } = await import("../src/modules/auth/service.js");
    const now = new Date();
    await mongoose.model("User").collection.insertOne({
      firebaseUid: "uid-unverified",
      email: "victim2@example.com",
      emailVerified: false,
      welcomeSentAt: null,
      createdAt: now,
      updatedAt: now,
    });
    vi.spyOn(authStub, "getUser").mockResolvedValue({ uid: "uid-unverified", email: "owner2@example.com", emailVerified: false });

    expect(await recordVerifiedEmail("uid-unverified")).toBe(false);
    expect(resendSend).not.toHaveBeenCalled();
  });

  test("send verification: branded email through Resend, no link in logs", async () => {
    goLive();
    const logs = watchLogs();
    vi.spyOn(authStub, "generateEmailVerificationLink").mockResolvedValue(firebaseLink("verifyEmail"));

    const res = await asUser("/api/auth/send-verification", newToken);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ alreadyVerified: false, delivered: true, fallback: null });
    expect(sentSubjects()).toEqual(["Verify your email for WestForce -> new.person@example.com"]);
    expect(logs.text()).not.toContain(CODE);
  });

  test("send verification: a Firebase failure is a clear error", async () => {
    goLive();
    vi.spyOn(authStub, "generateEmailVerificationLink").mockRejectedValue(new Error("boom"));

    const res = await asUser("/api/auth/send-verification", newToken);

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(bodyOf(res).message ?? bodyOf(res).error).toMatch(/could not send the verification email/i);
    expect(resendSend).not.toHaveBeenCalled();
  });

  test("welcome email goes out once, however often email-verified is called", async () => {
    goLive();
    vi.spyOn(authStub, "getUser").mockResolvedValue({ uid: "uid-auth-new", email: "new.person@example.com", emailVerified: true });

    const calls = await Promise.all([1, 2, 3].map(() => asUser("/api/auth/email-verified", newToken)));
    await asUser("/api/auth/email-verified", newToken);

    expect(calls.map((res) => bodyOf(res).verified)).toEqual([true, true, true]);
    expect(sentSubjects()).toEqual(["Welcome to WestForce -> new.person@example.com"]);
    const user = await mongoose.model("User").findOne({ firebaseUid: "uid-auth-new" }).lean<{ welcomeSentAt: Date | null }>();
    expect(user?.welcomeSentAt).toBeInstanceOf(Date);
  });

  test("accounts older than two weeks are marked verified but not welcomed", async () => {
    goLive();
    const { recordVerifiedEmail } = await import("../src/modules/auth/service.js");
    const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await mongoose.model("User").collection.insertOne({
      firebaseUid: "uid-old",
      email: "old@example.com",
      emailVerified: false,
      welcomeSentAt: null,
      createdAt: old,
      updatedAt: old,
    });

    expect(await recordVerifiedEmail("uid-old")).toBe(false);
    expect(resendSend).not.toHaveBeenCalled();
    const user = await mongoose.model("User").findOne({ firebaseUid: "uid-old" }).lean<{ emailVerified: boolean; welcomeSentAt: Date | null }>();
    expect(user?.emailVerified).toBe(true);
    expect(user?.welcomeSentAt).toBeNull();
  });
});

describe("shared rules", () => {
  test("a bad email is a 400", async () => {
    const res = await resetFrom("203.0.113.12", { email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(bodyOf(res).success).toBe(false);
  });

  test("send verification needs a signed in user", async () => {
    expect((await request(app).post("/api/auth/send-verification")).status).toBe(401);
  });

  test("an already verified user is told so and nothing is sent", async () => {
    goLive();
    const generate = vi.spyOn(authStub, "generateEmailVerificationLink");

    const res = await asUser("/api/auth/send-verification", verifiedToken);

    expect(res.status).toBe(200);
    expect(bodyOf(res).alreadyVerified).toBe(true);
    expect(generate).not.toHaveBeenCalled();
    expect(resendSend).not.toHaveBeenCalled();
  });

  test("the sixth reset request from one IP in 15 minutes is a 429; other IPs still work", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      statuses.push((await resetFrom("203.0.113.20", { email: `user${i}@example.com` })).status);
    }

    expect(statuses).toEqual([200, 200, 200, 200, 200, 429]);
    expect((await resetFrom("203.0.113.21", { email: "user@example.com" })).status).toBe(200);
  });
});
