import { beforeAll, describe, expect, test, vi } from "vitest";

const { created, generateContent } = vi.hoisted(() => ({
  created: [],
  generateContent: vi.fn(async () => ({
    text: JSON.stringify({ resume: { content: {} } }),
  })),
}));

// Stub the SDK so no real client (or network call) is made.
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    constructor(options) {
      created.push(options);
      this.models = { generateContent };
    }
  },
}));

let service;

beforeAll(async () => {
  service = await import("../src/modules/resumes/ai.service");
});

describe("geminiResumeService", () => {
  test("creates the Gemini client with a ~30s default request timeout", () => {
    expect(created).toHaveLength(1);
    expect(created[0].httpOptions?.timeout).toBe(30000);
  });

  test("enhance call uses a 120s timeout", async () => {
    generateContent.mockClear();

    await service.enhanceResumeWithGemini({ resumeText: "My resume" });

    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(
      generateContent.mock.calls[0][0].config.httpOptions?.timeout
    ).toBe(120000);
  });

  test("build call keeps the 30s client default", async () => {
    generateContent.mockClear();

    await service.buildResumeWithGemini({ portfolio: {} });

    expect(
      generateContent.mock.calls[0][0].config.httpOptions
    ).toBeUndefined();
  });
});
