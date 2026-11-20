import express from "express";
import request from "supertest";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const { enhanceResumeWithGemini } = vi.hoisted(() => ({
  enhanceResumeWithGemini: vi.fn(),
}));
let app;

// Signed-in, paid user; fake DOCX text; fake Gemini. No real services.
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
// No MongoDB here, so skip the daily caps (tested in resumeAiGuards.test.js).
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

afterEach(() => {
  enhanceResumeWithGemini.mockReset();
  vi.restoreAllMocks();
});

function enhance() {
  return request(app)
    .post("/api/resumes/enhance")
    .attach("file", Buffer.from("fake docx"), {
      filename: "resume.docx",
      contentType: DOCX,
    });
}

describe("POST /api/resumes/enhance errors", () => {
  test.each([
    ["AbortError", "This operation was aborted"],
    ["TimeoutError", "The operation was aborted due to timeout"],
  ])("Gemini %s returns 504 with a friendly message", async (name, msg) => {
    enhanceResumeWithGemini.mockRejectedValueOnce(new DOMException(msg, name));

    const res = await enhance();

    expect(res.status).toBe(504);
    expect(res.body).toMatchObject({
      success: false,
      message: "The AI took too long. Please try again.",
    });
  });

  test("other errors return 500 with a generic message, never the raw error", async () => {
    enhanceResumeWithGemini.mockRejectedValueOnce(
      new Error("secret internal detail: key=abc")
    );

    const res = await enhance();

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Failed to enhance resume using AI.");
    expect(JSON.stringify(res.body)).not.toContain("secret internal detail");
  });

  test("success still returns the enhanced resume", async () => {
    enhanceResumeWithGemini.mockResolvedValueOnce({ resume: { title: "R" } });

    const res = await enhance();

    expect(res.status).toBe(200);
    expect(res.body.resume).toEqual({ title: "R" });
  });

  test("file over 10 MB returns 400 with the size message", async () => {
    const res = await request(app)
      .post("/api/resumes/enhance")
      .attach("file", Buffer.alloc(10 * 1024 * 1024 + 1), {
        filename: "resume.docx",
        contentType: DOCX,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Resume file is too large. Maximum size is 10 MB.");
    expect(enhanceResumeWithGemini).not.toHaveBeenCalled();
  });

  test("wrong file type returns 400", async () => {
    const res = await request(app)
      .post("/api/resumes/enhance")
      .attach("file", Buffer.from("x"), { filename: "a.png", contentType: "image/png" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Unsupported resume file type/);
  });
});
