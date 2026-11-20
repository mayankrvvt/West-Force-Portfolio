import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

// POST /api/ats/check: paid only, Gemini client mocked (no real calls).
const generateContent = vi.fn();

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
});

async function user({ paid = true } = {}) {
  counter += 1;
  const uid = `uid-ats-${counter}`;
  const email = `ats${counter}@example.com`;
  const token = `token-ats-${counter}`;
  testUsers.set(token, { uid, email, email_verified: true });
  const record = await mongoose.model("User").create({ firebaseUid: uid, email });
  if (paid) {
    await mongoose.model("Entitlement").create({
      email,
      firebaseUid: uid,
      plan: "solo",
      purchaseId: new mongoose.Types.ObjectId(),
      grantedAt: new Date(),
    });
  }
  return { uid, token, user: record };
}

const reply = (value) => ({ text: typeof value === "string" ? value : JSON.stringify(value) });
const body = { resumeText: "React developer with 3 years of Node.js", jobDescription: "Need React and AWS" };
const check = (token, payload = body) =>
  request(app).post("/api/ats/check").set("Authorization", `Bearer ${token}`).send(payload);

describe("POST /api/ats/check", () => {
  test("needs sign-in and a paid plan", async () => {
    const anon = await request(app).post("/api/ats/check").send(body);
    const free = await user({ paid: false });
    const unpaid = await check(free.token);

    expect(anon.status).toBe(401);
    expect(unpaid.status).toBe(402);
    expect(generateContent).not.toHaveBeenCalled();
  });

  test("returns a clamped, cleaned result", async () => {
    const { token } = await user();
    generateContent.mockResolvedValue(
      reply({
        score: 130.4,
        matchedKeywords: ["React", "react", { keyword: "Node.js" }],
        missingKeywords: ["AWS"],
        suggestions: ["Add AWS projects."],
        summary: "Good match.",
      })
    );

    const res = await check(token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      score: 100,
      matchedKeywords: ["React", "Node.js"],
      missingKeywords: ["AWS"],
      suggestions: ["Add AWS projects."],
      summary: "Good match.",
    });
    const call = generateContent.mock.calls[0][0];
    expect(call.config.responseMimeType).toBe("application/json");
    expect(call.contents).toContain("Need React and AWS");
  });

  test("checks a saved resume and stores its score", async () => {
    const { uid, token, user: owner } = await user();
    const resume = await mongoose.model("Resume").create({
      userId: uid,
      ownerId: owner._id,
      title: "Saved",
      content: { name: "Jane", summary: "Python engineer", skills: ["Python", "Django"] },
    });
    generateContent.mockResolvedValue(
      reply({ score: "64", matchedKeywords: [], missingKeywords: [], suggestions: [], summary: "" })
    );

    const res = await check(token, { resumeId: String(resume._id), jobDescription: "Python role" });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(64);
    expect(generateContent.mock.calls[0][0].contents).toContain("Python engineer");
    expect((await mongoose.model("Resume").findById(resume._id)).atsScore).toBe(64);
  });

  test("another user's resume gives 404", async () => {
    const a = await user();
    const b = await user();
    const resume = await mongoose.model("Resume").create({ userId: a.uid, ownerId: a.user._id, title: "A" });

    const res = await check(b.token, { resumeId: String(resume._id), jobDescription: "Any" });

    expect(res.status).toBe(404);
    expect(generateContent).not.toHaveBeenCalled();
  });

  test("validation: needs resume and job description", async () => {
    const { token } = await user();
    const noResume = await check(token, { jobDescription: "x" });
    const noJob = await check(token, { resumeText: "x" });

    expect(noResume.status).toBe(400);
    expect(noJob.status).toBe(400);
  });

  test("timeout gives 504", async () => {
    const { token } = await user();
    generateContent.mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"));

    const res = await check(token);

    expect(res.status).toBe(504);
  });

  test("bad JSON or a missing score gives a generic 500", async () => {
    const { token } = await user();
    generateContent.mockResolvedValueOnce(reply("not json at all"));
    generateContent.mockResolvedValueOnce(reply({ matchedKeywords: [] }));

    const badJson = await check(token);
    const noScore = await check(token);

    expect(badJson.status).toBe(500);
    expect(noScore.status).toBe(500);
    expect(badJson.body.success).toBe(false);
  });

  test("allows 20 checks per user per day", async () => {
    const { token } = await user();
    generateContent.mockResolvedValue(
      reply({ score: 50, matchedKeywords: [], missingKeywords: [], suggestions: [], summary: "" })
    );

    for (let i = 0; i < 20; i += 1) {
      const res = await check(token);
      expect(res.status).toBe(200);
    }
    const blocked = await check(token);

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("ATS_DAILY_LIMIT");

    const other = await user();
    expect((await check(other.token)).status).toBe(200);
  });

  test("a failed check is not counted", async () => {
    const { uid, token } = await user();
    generateContent.mockRejectedValueOnce(new DOMException("The operation timed out.", "TimeoutError"));

    expect((await check(token)).status).toBe(504);

    const { atsUsageKey } = await import("../src/modules/ats/limits");
    const { usageCount } = await import("../src/lib/usageCounter");
    expect(await usageCount(atsUsageKey(uid))).toBe(0);
  });

  test("the daily limit survives a server restart (stored in MongoDB)", async () => {
    const { token } = await user();
    generateContent.mockResolvedValue(
      reply({ score: 50, matchedKeywords: [], missingKeywords: [], suggestions: [], summary: "" })
    );
    for (let i = 0; i < 20; i += 1) {
      expect((await check(token)).status).toBe(200);
    }

    // Simulates a restart: reload every backend module, keep MongoDB.
    vi.resetModules();
    mongoose.deleteModel(/.+/);
    app = await loadApp();

    const blocked = await check(token);
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("ATS_DAILY_LIMIT");
  });
});
