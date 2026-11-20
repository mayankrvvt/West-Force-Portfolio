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

  test("the score comes from code; the AI's score:100 is ignored", async () => {
    const { token } = await user();
    generateContent.mockResolvedValue(
      reply({
        score: 100,
        suggestions: ["Add AWS projects.", "add aws projects."],
        summary: "Good match.",
      })
    );

    const res = await check(token);

    expect(res.status).toBe(200);
    expect(res.body.score).toBeLessThan(100);
    expect(res.body.score).toBe(Math.round(res.body.breakdown.reduce((sum, item) => sum + item.points, 0)));
    expect(res.body.breakdown.map((item) => item.id)).toEqual([
      "keywords", "sections", "bullets", "contact", "dates", "length", "readability",
    ]);
    expect(res.body.keywords).toEqual({ matched: ["react"], missing: ["aws"], coverage: 0.5 });
    expect(res.body.advice).toEqual({ summary: "Good match.", suggestions: ["Add AWS projects."] });
    expect(res.body.checkId).toMatch(/^[a-f0-9]{24}$/);
    // Older fields stay for existing clients.
    expect(res.body.matchedKeywords).toEqual(["react"]);
    expect(res.body.missingKeywords).toEqual(["aws"]);
    expect(res.body.suggestions).toEqual(["Add AWS projects."]);
    expect(res.body.summary).toBe("Good match.");

    const call = generateContent.mock.calls[0][0];
    expect(call.config.responseMimeType).toBe("application/json");
    expect(call.contents).toContain("Need React and AWS");
    expect(call.contents).toContain(`scored this resume ${res.body.score} out of 100`);
  });

  test("the same input gives the same score every time", async () => {
    const { token } = await user();
    generateContent.mockResolvedValueOnce(reply({ score: 5, summary: "", suggestions: [] }));
    generateContent.mockResolvedValueOnce(reply({ score: 95, summary: "", suggestions: [] }));

    const first = await check(token);
    const second = await check(token);

    expect(second.body.score).toBe(first.body.score);
    expect(second.body.breakdown).toEqual(first.body.breakdown);
  });

  test("saves a history row for each check", async () => {
    const { uid, token } = await user();
    generateContent.mockResolvedValue(reply({ summary: "Fine.", suggestions: [] }));

    const res = await check(token, { ...body, jobTitle: "Frontend developer" });
    const rows = await mongoose.model("AtsCheck").find({ userId: uid }).lean();

    expect(rows).toHaveLength(1);
    expect(String(rows[0]._id)).toBe(res.body.checkId);
    expect(rows[0]).toMatchObject({
      score: res.body.score,
      jobTitle: "Frontend developer",
      resumeTitle: "Uploaded resume",
      jobSnippet: "Need React and AWS",
      matched: ["react"],
      missing: ["aws"],
    });
    expect(rows[0].checks).toHaveLength(7);
  });

  test("checks a saved resume and stores its score", async () => {
    const { uid, token, user: owner } = await user();
    const resume = await mongoose.model("Resume").create({
      userId: uid,
      ownerId: owner._id,
      title: "Saved",
      content: { name: "Jane", summary: "Python engineer", skills: ["Python", "Django"] },
    });
    generateContent.mockResolvedValue(reply({ score: "64", suggestions: [], summary: "" }));

    const res = await check(token, { resumeId: String(resume._id), jobDescription: "Python role" });

    expect(res.status).toBe(200);
    expect(res.body.score).not.toBe(64);
    expect(res.body.keywords.matched).toEqual(["python"]);
    const sections = res.body.breakdown.find((item) => item.id === "sections");
    expect(sections.detail).toBe("Missing: Experience, Education.");
    expect(generateContent.mock.calls[0][0].contents).toContain("Python engineer");
    expect((await mongoose.model("Resume").findById(resume._id)).atsScore).toBe(res.body.score);
    const row = await mongoose.model("AtsCheck").findOne({ userId: uid }).lean();
    expect(String(row.resumeId)).toBe(String(resume._id));
    expect(row.resumeTitle).toBe("Saved");
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

  test("an AI timeout still gives 200 with the score and advice: null", async () => {
    const { uid, token } = await user();
    generateContent.mockRejectedValue(new DOMException("The operation timed out.", "TimeoutError"));

    const res = await check(token);

    expect(res.status).toBe(200);
    expect(res.body.advice).toBeNull();
    expect(res.body.summary).toBe("");
    expect(typeof res.body.score).toBe("number");
    expect(res.body.breakdown).toHaveLength(7);
    // Timeouts are not retried: the call already waited the full time.
    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(await mongoose.model("AtsCheck").countDocuments({ userId: uid })).toBe(1);
  });

  test("bad AI JSON gives 200 with advice: null", async () => {
    const { token } = await user();
    generateContent.mockResolvedValue(reply("not json at all"));

    const res = await check(token);

    expect(res.status).toBe(200);
    expect(res.body.advice).toBeNull();
    expect(res.body.keywords.missing).toEqual(["aws"]);
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
    const missingResume = { resumeId: String(new mongoose.Types.ObjectId()), jobDescription: "Any" };

    expect((await check(token, missingResume)).status).toBe(404);

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

describe("GET /api/ats/history", () => {
  const history = (token, query = "") =>
    request(app).get(`/api/ats/history${query}`).set("Authorization", `Bearer ${token}`);

  // Written straight to the collection so createdAt can be set.
  async function seed(uid, rows) {
    await mongoose.model("AtsCheck").collection.insertMany(
      rows.map(({ daysAgo, ...rest }) => ({
        userId: uid,
        resumeId: null,
        resumeTitle: "Uploaded resume",
        jobTitle: `Job ${daysAgo}`,
        jobSnippet: "",
        score: 50 + daysAgo,
        checks: [{ id: "length", label: "Length", weight: 10, points: 10, status: "pass", detail: "", fixes: [] }],
        matched: [],
        missing: [],
        createdAt: new Date(Date.now() - daysAgo * 86_400_000),
        ...rest,
      }))
    );
  }

  test("needs sign-in and a paid plan", async () => {
    const free = await user({ paid: false });

    expect((await request(app).get("/api/ats/history")).status).toBe(401);
    const unpaid = await history(free.token);
    expect(unpaid.status).toBe(402);
    expect(unpaid.body.code).toBe("PAYMENT_REQUIRED");
  });

  test("shows only the caller's checks, newest first", async () => {
    const me = await user();
    const other = await user();
    await seed(me.uid, [{ daysAgo: 3 }, { daysAgo: 1 }, { daysAgo: 2 }]);
    await seed(other.uid, [{ daysAgo: 0 }]);

    const res = await history(me.token);

    expect(res.status).toBe(200);
    expect(res.body.checks.map((row) => row.jobTitle)).toEqual(["Job 1", "Job 2", "Job 3"]);
    expect(Object.keys(res.body.checks[0]).sort()).toEqual(
      ["_id", "breakdown", "createdAt", "jobTitle", "resumeTitle", "score"]
    );
    expect(res.body.checks[0].breakdown[0].id).toBe("length");
  });

  test("respects the limit and the resume filter", async () => {
    const me = await user();
    const resumeId = new mongoose.Types.ObjectId();
    await seed(me.uid, [{ daysAgo: 1 }, { daysAgo: 2 }, { daysAgo: 3, resumeId }, { daysAgo: 4, resumeId }]);

    const limited = await history(me.token, "?limit=2");
    const filtered = await history(me.token, `?resumeId=${resumeId}`);
    const tooMany = await history(me.token, "?limit=500");

    expect(limited.body.checks.map((row) => row.jobTitle)).toEqual(["Job 1", "Job 2"]);
    expect(filtered.body.checks.map((row) => row.jobTitle)).toEqual(["Job 3", "Job 4"]);
    expect(tooMany.status).toBe(400);
  });

  test("a new check shows up in history", async () => {
    const me = await user();
    generateContent.mockResolvedValue(reply({ summary: "", suggestions: [] }));

    const created = await check(me.token);
    const res = await history(me.token);

    expect(res.body.checks).toHaveLength(1);
    expect(res.body.checks[0]).toMatchObject({ _id: created.body.checkId, score: created.body.score });
  });
});
