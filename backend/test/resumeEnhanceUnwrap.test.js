import express from "express";
import request from "supertest";
import { beforeAll, describe, expect, test, vi } from "vitest";

// The enhance reply must keep the ATS analysis and the change list next to
// the resume. Signed-in paid user, fake DOCX text, fake Gemini. No real services.
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const { enhanceResumeWithGemini } = vi.hoisted(() => ({
  enhanceResumeWithGemini: vi.fn(),
}));
let app;

vi.mock("../src/middleware/auth", () => {
  const authenticateUser = (req, res, next) => {
    req.user = { uid: "test-user" };
    next();
  };
  const currentUser = (req) => req.user;
  return { default: authenticateUser, authenticateUser, currentUser };
});
vi.mock("../src/middleware/requirePaid", () => ({
  requirePaidUser: (req, res, next) => next(),
}));
vi.mock("../src/modules/resumes/limits", () => ({
  resumeBuildDailyLimit: (req, res, next) => next(),
  resumeEnhanceDailyLimit: (req, res, next) => next(),
}));
vi.mock("mammoth", () => ({
  extractRawText: async () => ({ value: "Jane Doe, Developer" }),
}));
vi.mock("../src/modules/resumes/ai.service", () => ({
  buildResumeWithGemini: vi.fn(),
  enhanceResumeWithGemini,
}));

beforeAll(async () => {
  const { default: resumeRoutes } = await import("../src/modules/resumes/routes");
  const { httpLogger } = await import("../src/lib/logger");
  const { errorHandler } = await import("../src/lib/errors");
  app = express();
  app.use(httpLogger);
  app.use(express.json());
  app.use("/api/resumes", resumeRoutes);
  app.use(errorHandler);
});

describe("POST /api/resumes/enhance keeps the analysis", () => {
  test("atsAnalysis and changes are returned with the resume", async () => {
    const atsAnalysis = { scoreBefore: 55, scoreAfter: 81, missingKeywords: ["Docker"] };
    const changes = ["Rewrote the summary", "Added numbers to bullets"];
    enhanceResumeWithGemini.mockResolvedValueOnce({
      resume: { title: "Developer Resume", content: { name: "Jane Doe" } },
      atsAnalysis,
      changes,
    });

    const res = await request(app)
      .post("/api/resumes/enhance")
      .attach("file", Buffer.from("fake docx"), { filename: "resume.docx", contentType: DOCX });

    expect(res.status).toBe(200);
    expect(res.body.resume.title).toBe("Developer Resume");
    expect(res.body.resume.content.name).toBe("Jane Doe");
    expect(res.body.resume.atsAnalysis).toEqual(atsAnalysis);
    expect(res.body.resume.changes).toEqual(changes);
  });
});
