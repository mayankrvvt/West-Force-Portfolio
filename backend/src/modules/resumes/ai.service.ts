import { gemini, ENHANCE_TIMEOUT_MS } from "../../lib/clients/gemini";
import { config } from "../../lib/config";
import { logger } from "../../lib/logger";
import { normalizeEnhanceResult, normalizeResume, type ResumePayload } from "./normalize";
import { buildResumePrompt, enhanceResumePrompt } from "./prompts";

export type BuildResumeInput = ResumePayload & {
  portfolio: unknown;
  options?: unknown;
  userId?: string;
};

export type EnhanceResumeInput = {
  resumeText: string;
  portfolio?: unknown;
  jobDescription?: string;
  options?: unknown;
  targetRole?: string;
  country?: string;
  userId?: string;
};

// One shared client (30s default timeout) from src/lib/clients/gemini.ts.
// Enhancing a whole resume (plus ATS analysis) is slower, so that call
// overrides the timeout with ENHANCE_TIMEOUT_MS (120s).
const ai = gemini;

const MODEL = config.GEMINI_RESUME_MODEL;

/**
 * Parses Gemini's JSON reply (markdown code fences are removed first).
 * Returns unknown: callers validate or normalize the shape.
 */
export function parseGeminiJson(text: string | undefined): unknown {
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  // Remove markdown code fences if Gemini returns them.
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as unknown;
  } catch (error) {
    logger.error({ err: error, response: text.slice(0, 2000) }, "Gemini JSON parsing failed.");

    throw new Error("Gemini returned invalid resume JSON.", {
      cause: error,
    });
  }
}

function requireClient() {
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  return ai;
}

/** Builds a new resume from portfolio data. */
export async function buildResumeWithGemini({
  portfolio,
  targetRole = "Software Engineer",
  country = "Canada",
  experienceLevel = "Entry Level",
}: BuildResumeInput) {
  const client = requireClient();

  const response = await client.models.generateContent({
    model: MODEL,
    contents: buildResumePrompt({ portfolio, targetRole, country, experienceLevel }),
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  });

  return normalizeResume(
    parseGeminiJson(response.text),
    { targetRole, country, experienceLevel },
    MODEL
  );
}

/** Enhances an existing resume, with an ATS analysis when a job description is given. */
export async function enhanceResumeWithGemini({
  resumeText,
  portfolio,
  jobDescription = "",
  options = [],
  targetRole = "Software Engineer",
  country = "Canada",
}: EnhanceResumeInput) {
  const client = requireClient();

  const response = await client.models.generateContent({
    model: MODEL,
    contents: enhanceResumePrompt({
      resumeText,
      portfolio,
      jobDescription,
      options,
      targetRole,
      country,
    }),
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      httpOptions: {
        timeout: ENHANCE_TIMEOUT_MS,
      },
    },
  });

  return normalizeEnhanceResult(
    parseGeminiJson(response.text),
    { targetRole, country, experienceLevel: "Entry Level" },
    MODEL
  );
}
