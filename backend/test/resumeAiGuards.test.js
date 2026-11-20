import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

// AI guards: one retry on temporary Gemini failures, the AI resume shape
// checked before it is returned, and daily caps for build and enhance.
// Gemini client mocked, fake DOCX text, in-memory MongoDB. No real services.
process.env.RESUME_BUILD_DAILY_LIMIT = "2";
process.env.RESUME_ENHANCE_DAILY_LIMIT = "2";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const generateContent = vi.fn();

vi.mock("mammoth", () => ({
  extractRawText: async () => ({ value: "Jane Doe, Developer" }),
}));

let app;
let mongoose;
let counter = 0;

beforeAll(async () => {
  vi.doMock("../src/lib/clients/gemini", () => ({
    gemini: { models: { generateContent } },
    DEFAULT_TIMEOUT_MS: 1000,
    ENHANCE_TIMEOUT_MS: 1000,
    ATS_TIMEOUT_MS: 1000,
  }));
  mongoose = await startMongo();
  app = await loadApp();
});

beforeEach(() => {
  generateContent.mockReset();
});

afterAll(async () => {
  testUsers.clear();
  await stopMongo();
  delete process.env.RESUME_BUILD_DAILY_LIMIT;
  delete process.env.RESUME_ENHANCE_DAILY_LIMIT;
});

async function paidUser() {
  counter += 1;
  const uid = `uid-ai-guard-${counter}`;
  const email = `aiguard${counter}@example.com`;
  const token = `token-ai-guard-${counter}`;
  testUsers.set(token, { uid, email, email_verified: true });
  await mongoose.model("User").create({ firebaseUid: uid, email });
  await mongoose.model("Entitlement").create({
    email,
    firebaseUid: uid,
    plan: "solo",
    purchaseId: new mongoose.Types.ObjectId(),
    grantedAt: new Date(),
  });
  return { uid, token };
}

/** The Gemini SDK's ApiError carries the HTTP status. */
const apiError = (status) => Object.assign(new Error(`Gemini HTTP ${status}`), { status });
const reply = (value) => ({ text: typeof value === "string" ? value : JSON.stringify(value) });
const goodResume = {
  title: "Developer Resume",
  content: { name: "Jane Doe", summary: "Developer", skills: ["React"], experience: [] },
};

const build = (token) =>
  request(app)
    .post("/api/resumes/build")
    .set("Authorization", `Bearer ${token}`)
    .send({ portfolio: { profile: { name: "Jane Doe" } } });

const enhance = (token) =>
  request(app)
    .post("/api/resumes/enhance")
    .set("Authorization", `Bearer ${token}`)
    .attach("file", Buffer.from("fake docx"), { filename: "resume.docx", contentType: DOCX });

async function usage(key) {
  const { usageCount } = await import("../src/lib/usageCounter");
  return usageCount(key);
}

describe("AI retry helper", () => {
  test("a 503 is retried once and the second try succeeds", async () => {
    const { withAiRetry } = await import("../src/lib/aiRetry");
    const call = vi.fn().mockRejectedValueOnce(apiError(503)).mockResolvedValueOnce("ok");

    expect(await withAiRetry(call, { delayMs: 0 })).toBe("ok");
    expect(call).toHaveBeenCalledTimes(2);
  });

  test("a 400 is never retried", async () => {
    const { withAiRetry } = await import("../src/lib/aiRetry");
    const call = vi.fn().mockRejectedValue(apiError(400));

    await expect(withAiRetry(call, { delayMs: 0 })).rejects.toThrow("Gemini HTTP 400");
    expect(call).toHaveBeenCalledTimes(1);
  });

  test("only one retry: a second 503 is final", async () => {
    const { withAiRetry } = await import("../src/lib/aiRetry");
    const call = vi.fn().mockRejectedValue(apiError(503));

    await expect(withAiRetry(call, { delayMs: 0 })).rejects.toThrow("Gemini HTTP 503");
    expect(call).toHaveBeenCalledTimes(2);
  });

  test("a timeout is never retried (it already waited the full time)", async () => {
    const { withAiRetry } = await import("../src/lib/aiRetry");
    const call = vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError"));

    await expect(withAiRetry(call, { delayMs: 0 })).rejects.toThrow("timed out");
    expect(call).toHaveBeenCalledTimes(1);
  });

  test("network errors and 429 are temporary; timeouts, 4xx and app errors are not", async () => {
    const { isTransientAiError } = await import("../src/lib/aiRetry");
    const { AppError } = await import("../src/lib/errors");

    expect(isTransientAiError(new DOMException("timed out", "TimeoutError"))).toBe(false);
    expect(isTransientAiError(new TypeError("fetch failed"))).toBe(true);
    expect(isTransientAiError(Object.assign(new Error("reset"), { code: "ECONNRESET" }))).toBe(true);
    expect(isTransientAiError(apiError(429))).toBe(true);
    expect(isTransientAiError(apiError(404))).toBe(false);
    expect(isTransientAiError(new AppError(503, "Not configured."))).toBe(false);
    expect(isTransientAiError(new Error("Gemini returned invalid resume JSON."))).toBe(false);
  });

  test("a REST reply with a 5xx status is retried, a 4xx is not", async () => {
    const { withAiRetry } = await import("../src/lib/aiRetry");
    const retryResult = (r) => r.status >= 500;
    const flaky = vi.fn().mockResolvedValueOnce({ status: 503 }).mockResolvedValueOnce({ status: 200 });
    const rejected = vi.fn().mockResolvedValue({ status: 400 });

    expect(await withAiRetry(flaky, { delayMs: 0, retryResult })).toEqual({ status: 200 });
    expect(await withAiRetry(rejected, { delayMs: 0, retryResult })).toEqual({ status: 400 });
    expect(flaky).toHaveBeenCalledTimes(2);
    expect(rejected).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/resumes/build", () => {
  test("a Gemini 503 is retried once and the build succeeds", async () => {
    const { token } = await paidUser();
    generateContent.mockRejectedValueOnce(apiError(503)).mockResolvedValueOnce(reply(goodResume));

    const res = await build(token);

    expect(res.status).toBe(200);
    expect(res.body.resume.content.name).toBe("Jane Doe");
    expect(generateContent).toHaveBeenCalledTimes(2);
  });

  test("a Gemini 400 is not retried", async () => {
    const { token } = await paidUser();
    generateContent.mockRejectedValue(apiError(400));

    const res = await build(token);

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Failed to build resume using AI.");
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["wrong types", { content: { name: "Jane", experience: "five years", skills: "React" } }],
    ["no content", { title: "Resume" }],
    ["empty content", { content: { name: "", experience: [] } }],
    ["a list instead of a resume", [goodResume]],
    ["text that is not JSON", "Sorry, I cannot help with that."],
  ])("a bad AI shape (%s) gives a 502 and no resume", async (_label, value) => {
    const { token } = await paidUser();
    generateContent.mockResolvedValue(reply(value));

    const res = await build(token);

    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({
      success: false,
      code: "AI_BAD_RESPONSE",
      message: "The AI sent back a resume we could not use. Please try again.",
    });
    expect(res.body.resume).toBeUndefined();
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  test("daily cap: blocked with 429 when hit, failed builds are given back", async () => {
    const { uid, token } = await paidUser();
    const { resumeBuildUsageKey } = await import("../src/modules/resumes/limits");

    generateContent.mockResolvedValueOnce(reply({ content: {} }));
    expect((await build(token)).status).toBe(502);
    // The use is given back after the response is sent, so wait for it.
    await vi.waitFor(async () => expect(await usage(resumeBuildUsageKey(uid))).toBe(0));

    generateContent.mockResolvedValue(reply(goodResume));
    expect((await build(token)).status).toBe(200);
    expect((await build(token)).status).toBe(200);
    generateContent.mockClear();

    const blocked = await build(token);

    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({
      success: false,
      code: "RESUME_BUILD_DAILY_LIMIT",
      message: "You have used all 2 AI resume builds for today. Please try again tomorrow.",
    });
    expect(generateContent).not.toHaveBeenCalled();
    expect(await usage(resumeBuildUsageKey(uid))).toBe(2);

    const other = await paidUser();
    expect((await build(other.token)).status).toBe(200);
  });
});

describe("POST /api/resumes/enhance", () => {
  const enhanced = { resume: goodResume, atsAnalysis: { scoreAfter: 80 }, changes: ["Summary"] };

  test("a good reply returns the enhanced resume", async () => {
    const { token } = await paidUser();
    generateContent.mockResolvedValue(reply(enhanced));

    const res = await enhance(token);

    expect(res.status).toBe(200);
    expect(res.body.resume.content.name).toBe("Jane Doe");
  });

  test("a bad AI shape gives a 502 and no resume", async () => {
    const { token } = await paidUser();
    generateContent.mockResolvedValue(reply({ resume: { content: { skills: [{ a: 1 }] } } }));

    const res = await enhance(token);

    expect(res.status).toBe(502);
    expect(res.body.code).toBe("AI_BAD_RESPONSE");
    expect(res.body.resume).toBeUndefined();
  });

  test("daily cap: blocked with 429 when hit, failed enhancements are given back", async () => {
    const { uid, token } = await paidUser();
    const { resumeEnhanceUsageKey } = await import("../src/modules/resumes/limits");

    generateContent.mockRejectedValueOnce(apiError(400));
    expect((await enhance(token)).status).toBe(500);
    await vi.waitFor(async () => {
      expect(await usage(resumeEnhanceUsageKey(uid))).toBe(0);
    });

    generateContent.mockResolvedValue(reply(enhanced));
    expect((await enhance(token)).status).toBe(200);
    expect((await enhance(token)).status).toBe(200);

    const blocked = await enhance(token);

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("RESUME_ENHANCE_DAILY_LIMIT");
    expect(blocked.body.message).toBe(
      "You have used all 2 AI resume enhancements for today. Please try again tomorrow."
    );
    expect(await usage(resumeEnhanceUsageKey(uid))).toBe(2);
  });
});
