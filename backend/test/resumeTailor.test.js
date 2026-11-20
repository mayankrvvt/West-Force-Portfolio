import express from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { startMongo, stopMongo } from "./helpers/mongo";

// Tailor a saved resume to a job ad. Fake Firebase, fake Gemini, in-memory
// MongoDB. No real services. The router is mounted here by hand.
const generateContent = vi.fn();
const testUsers = new Map();

let app;
let mongoose;
let Resume;
let counter = 0;

beforeAll(async () => {
  vi.doMock("../src/lib/clients/firebase", () => ({
    firebaseApp: {},
    auth: {
      verifyIdToken: (token) => {
        const user = testUsers.get(token);
        return user ? Promise.resolve(user) : Promise.reject(new Error("Token rejected by test stub."));
      },
    },
  }));
  vi.doMock("../src/lib/clients/gemini", () => ({
    gemini: { models: { generateContent } },
    DEFAULT_TIMEOUT_MS: 1000,
    ENHANCE_TIMEOUT_MS: 1000,
    ATS_TIMEOUT_MS: 1000,
  }));

  mongoose = await startMongo();

  const { default: tailorRoutes } = await import("../src/modules/resumes/tailor.routes");
  const { httpLogger } = await import("../src/lib/logger");
  const { errorHandler } = await import("../src/lib/errors");
  Resume = (await import("../src/modules/resumes/model")).default;

  app = express();
  app.use(httpLogger);
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/resumes", tailorRoutes);
  app.use(errorHandler);
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
  const uid = `uid-tailor-${counter}`;
  const email = `tailor${counter}@example.com`;
  const token = `token-tailor-${counter}`;
  testUsers.set(token, { uid, email, email_verified: true });
  await mongoose.model("User").create({ firebaseUid: uid, email });
  if (paid) {
    await mongoose.model("Entitlement").create({
      email,
      firebaseUid: uid,
      plan: "solo",
      purchaseId: new mongoose.Types.ObjectId(),
      grantedAt: new Date(),
    });
  }
  return { uid, token };
}

const originalContent = {
  name: "Emma Tremblay",
  summary: "Personal support worker with five years of home care experience.",
  experience: [
    {
      id: "e1",
      company: "Peel Home Care",
      position: "Personal Support Worker",
      location: "Brampton, ON",
      startDate: "2021",
      endDate: "Present",
      bullets: ["Helped clients with daily living tasks", "Kept care notes in AlayaCare"],
    },
  ],
  education: [{ institution: "Sheridan College", degree: "PSW Certificate", startDate: "2020", endDate: "2021" }],
  skills: ["Personal care", "First aid"],
};

async function savedResume(uid, extra = {}) {
  return Resume.create({
    userId: uid,
    title: "Emma PSW Resume",
    version: 2,
    targetRole: "Personal Support Worker",
    content: originalContent,
    ...extra,
  });
}

const reply = (value) => ({ text: typeof value === "string" ? value : JSON.stringify(value) });

const tailor = (token, body) =>
  request(app).post("/api/resumes/tailor").set("Authorization", `Bearer ${token}`).send(body);

const jobAd = "Hiring a personal support worker. Must know AlayaCare, first aid and Hoyer lift.";

async function usage(key) {
  const { usageCount } = await import("../src/lib/usageCounter");
  return usageCount(key);
}

describe("POST /api/resumes/tailor", () => {
  test("an unpaid user is blocked (402, like the build route)", async () => {
    const { uid, token } = await user({ paid: false });
    const resume = await savedResume(uid);

    const res = await tailor(token, { resumeId: String(resume._id), jobDescription: jobAd });

    expect(res.status).toBe(402);
    expect(res.body.code).toBe("PAYMENT_REQUIRED");
    expect(generateContent).not.toHaveBeenCalled();
  });

  test("an empty job description is a 400", async () => {
    const { uid, token } = await user();
    const resume = await savedResume(uid);

    const res = await tailor(token, { resumeId: String(resume._id), jobDescription: "   " });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Paste the job ad or pick a saved job.");
    expect(generateContent).not.toHaveBeenCalled();
  });

  test("another user's resume is a 404", async () => {
    const owner = await user();
    const other = await user();
    const resume = await savedResume(owner.uid);

    const res = await tailor(other.token, { resumeId: String(resume._id), jobDescription: jobAd });

    expect(res.status).toBe(404);
    expect(generateContent).not.toHaveBeenCalled();
  });

  test("an invented employer, date or extra job is put back to the original", async () => {
    const { uid, token } = await user();
    const resume = await savedResume(uid);
    generateContent.mockResolvedValue(
      reply({
        summary: "Personal support worker skilled in AlayaCare and first aid.",
        experience: [
          { company: "Google", position: "Nurse Manager", startDate: "2010", bullets: ["Did more", "Kept AlayaCare care notes"] },
          { company: "Invented Corp", position: "Director", startDate: "2005", bullets: ["Led 50 people"] },
        ],
        bullets: [{ experienceIndex: 0, bulletIndex: 0, text: "Supported clients with daily living tasks", reason: "Job ad wording" }],
        skills: ["Personal care", "First aid"],
        addedKeywords: ["AlayaCare"],
      })
    );

    const res = await tailor(token, { resumeId: String(resume._id), jobDescription: jobAd, jobTitle: "PSW" });

    expect(res.status).toBe(200);
    const { content } = res.body.tailored;
    expect(content.experience).toHaveLength(1);
    expect(content.experience[0]).toMatchObject({
      company: "Peel Home Care",
      position: "Personal Support Worker",
      startDate: "2021",
      endDate: "Present",
    });
    // The AI's entry 0 names another employer, so its bullets are not used;
    // the edit by experienceIndex still applies to the original entry.
    expect(content.experience[0].bullets).toEqual([
      "Supported clients with daily living tasks",
      "Kept care notes in AlayaCare",
    ]);
    expect(content.education).toEqual(originalContent.education.map((e) => expect.objectContaining(e)));
    expect(res.body.tailored.title).toBe("Emma PSW Resume, tailored for PSW");
    expect(res.body.changes).toContainEqual({
      path: "experience.0.bullets.0",
      before: "Helped clients with daily living tasks",
      after: "Supported clients with daily living tasks",
      reason: "Job ad wording",
    });
    expect(res.body.original.content.experience[0].company).toBe("Peel Home Care");
  });

  test("a skill the resume does not show goes to skippedKeywords, and text that adds it is put back", async () => {
    const { uid, token } = await user();
    const resume = await savedResume(uid);
    generateContent.mockResolvedValue(
      reply({
        summary: "Personal support worker trained on the Hoyer lift.",
        skills: ["Personal care", "First aid", "AlayaCare", "Hoyer lift"],
        addedKeywords: ["Hoyer lift"],
      })
    );

    const res = await tailor(token, { resumeId: String(resume._id), jobDescription: jobAd });

    expect(res.status).toBe(200);
    expect(res.body.tailored.content.skills).toEqual(["Personal care", "First aid", "AlayaCare"]);
    expect(res.body.addedKeywords).toEqual(["AlayaCare"]);
    expect(res.body.skippedKeywords).toEqual([
      { keyword: "Hoyer lift", reason: expect.stringMatching(/Not found in your resume/) },
    ]);
    expect(res.body.tailored.content.summary).toBe(originalContent.summary);
  });

  test("bad AI JSON is a 502 and the daily use is given back", async () => {
    const { uid, token } = await user();
    const resume = await savedResume(uid);
    const { resumeTailorUsageKey } = await import("../src/modules/resumes/tailor.limits");
    generateContent.mockResolvedValue(reply("Sorry, I cannot help with that."));

    const res = await tailor(token, { resumeId: String(resume._id), jobDescription: jobAd });

    expect(res.status).toBe(502);
    expect(res.body.code).toBe("AI_BAD_RESPONSE");
    expect(res.body.tailored).toBeUndefined();
    // The use is given back after the response is sent, so wait for it.
    await vi.waitFor(async () => expect(await usage(resumeTailorUsageKey(uid))).toBe(0));
  });

  test("the daily cap answers 429 without calling the AI", async () => {
    const { uid, token } = await user();
    const resume = await savedResume(uid);
    const { resumeTailorUsageKey, RESUME_TAILOR_DAILY_LIMIT } = await import(
      "../src/modules/resumes/tailor.limits"
    );
    const { UsageCounter } = await import("../src/lib/usageCounter");
    await UsageCounter.create({
      key: resumeTailorUsageKey(uid),
      count: RESUME_TAILOR_DAILY_LIMIT,
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    const res = await tailor(token, { resumeId: String(resume._id), jobDescription: jobAd });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe("RESUME_TAILOR_DAILY_LIMIT");
    expect(generateContent).not.toHaveBeenCalled();
  });
});

describe("POST /api/resumes/tailor/save", () => {
  test("saves a new version linked to the source and leaves the source unchanged", async () => {
    const { uid, token } = await user();
    const source = await savedResume(uid);
    const before = JSON.stringify((await Resume.findById(source._id)).toObject().content);
    const tailored = {
      content: {
        ...originalContent,
        summary: "Personal support worker skilled in AlayaCare.",
        experience: [{ ...originalContent.experience[0], company: "Google" }],
      },
    };

    const res = await request(app)
      .post("/api/resumes/tailor/save")
      .set("Authorization", `Bearer ${token}`)
      .send({ sourceResumeId: String(source._id), tailored, jobTitle: "PSW", company: "Peel Region" });

    expect(res.status).toBe(201);
    expect(res.body.resume).toMatchObject({
      version: 3,
      sourceResumeId: String(source._id),
      title: "Emma PSW Resume, tailored for PSW",
      tailoredFor: { jobTitle: "PSW", company: "Peel Region", jobId: "" },
    });
    expect(res.body.resume.content.summary).toBe("Personal support worker skilled in AlayaCare.");
    expect(res.body.resume.content.experience[0].company).toBe("Peel Home Care");

    const after = await Resume.findById(source._id);
    expect(JSON.stringify(after.toObject().content)).toBe(before);
    expect(after.version).toBe(2);
    expect(await Resume.countDocuments({ userId: uid })).toBe(2);
  });

  test("an unpaid user cannot save", async () => {
    const { uid, token } = await user({ paid: false });
    const source = await savedResume(uid);

    const res = await request(app)
      .post("/api/resumes/tailor/save")
      .set("Authorization", `Bearer ${token}`)
      .send({ sourceResumeId: String(source._id), tailored: { content: originalContent }, jobTitle: "PSW" });

    expect(res.status).toBe(402);
  });
});

describe("guardTailored", () => {
  const twoJobs = {
    summary: "Personal support worker with 5 years in home care.",
    experience: [
      { company: "Peel Home Care", position: "Personal Support Worker", bullets: ["Helped 12 clients each week", "Kept care notes in AlayaCare"] },
      { company: "Sunrise Living", position: "Care Aide", bullets: ["Served meals to residents"] },
    ],
    skills: ["Personal care", "First aid"],
  };

  test("puts back a bullet that adds a new number, percent, dollar figure or tool name", async () => {
    const { guardTailored } = await import("../src/modules/resumes/tailor.service");
    const candidate = {
      ...twoJobs,
      summary: "Personal support worker with 5 years in home care, cut costs by 20%.",
      experience: [
        { ...twoJobs.experience[0], bullets: ["Helped 40 clients each week", "Kept care notes in AlayaCare and Epic"] },
        { ...twoJobs.experience[1], bullets: ["Served meals to residents, saving $5,000"] },
      ],
    };

    const { content } = guardTailored(twoJobs, candidate);

    expect(content.summary).toBe(twoJobs.summary);
    expect(content.experience[0].bullets).toEqual(twoJobs.experience[0].bullets);
    expect(content.experience[1].bullets).toEqual(twoJobs.experience[1].bullets);
  });

  test("keeps a reworded bullet whose numbers and names are already in the resume", async () => {
    const { guardTailored } = await import("../src/modules/resumes/tailor.service");
    const candidate = {
      ...twoJobs,
      summary: "Caring support worker with 5 years of home care at Peel Home Care.",
      experience: [
        { ...twoJobs.experience[0], bullets: ["Supported 12 clients every week", "Recorded care notes in alayacare"] },
        twoJobs.experience[1],
      ],
    };

    const { content } = guardTailored(twoJobs, candidate);

    expect(content.summary).toBe(candidate.summary);
    expect(content.experience[0].bullets).toEqual(candidate.experience[0].bullets);
  });

  test("reordered or missing experience entries never move bullets between employers", async () => {
    const { guardTailored } = await import("../src/modules/resumes/tailor.service");
    const reordered = { ...twoJobs, experience: [twoJobs.experience[1], twoJobs.experience[0]] };
    const shorter = { ...twoJobs, experience: [{ ...twoJobs.experience[1], bullets: ["Served hot meals to residents"] }] };

    for (const candidate of [reordered, shorter]) {
      const { content } = guardTailored(twoJobs, candidate);
      expect(content.experience.map((e) => e.company)).toEqual(["Peel Home Care", "Sunrise Living"]);
      expect(content.experience[0].bullets).toEqual(twoJobs.experience[0].bullets);
      expect(content.experience[1].bullets).toEqual(twoJobs.experience[1].bullets);
    }
  });
});

test("the tailor prompt keeps the original skill order", async () => {
  const { tailorResumePrompt } = await import("../src/modules/resumes/tailor.prompt");
  const prompt = tailorResumePrompt({ content: originalContent, jobDescription: jobAd });

  expect(prompt).not.toMatch(/reorder|new order/i);
  expect(prompt).toMatch(/keep the original skills in their order/i);
});
