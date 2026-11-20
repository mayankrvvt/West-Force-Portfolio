import { withAiRetry } from "../../lib/aiRetry";
import { gemini, ENHANCE_TIMEOUT_MS } from "../../lib/clients/gemini";
import { config } from "../../lib/config";
import { AppError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import {
  isJsonObject,
  normalizeEnhanceResult,
  normalizeResume,
  type ResumePayload,
} from "./normalize";
import { buildResumePrompt, enhanceResumePrompt } from "./prompts";
import { aiResume } from "./schema";

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

export const BAD_AI_RESUME_MESSAGE =
  "The AI sent back a resume we could not use. Please try again.";

const badAiResume = (cause: unknown) =>
  new AppError(502, BAD_AI_RESUME_MESSAGE, { code: "AI_BAD_RESPONSE", cause });

/**
 * Gemini's reply, checked against aiResume before anything is returned or
 * saved. The resume may be the reply itself or wrapped in `resume`. Bad JSON
 * or a bad shape is a 502, never a half-built resume.
 */
function readAiResume(text: string | undefined) {
  let parsed: unknown;

  try {
    parsed = parseGeminiJson(text);
  } catch (error) {
    throw badAiResume(error);
  }

  if (!isJsonObject(parsed)) throw badAiResume(new Error("Gemini reply is not an object."));

  const resume = isJsonObject(parsed.resume) ? parsed.resume : parsed;
  const checked = aiResume.safeParse(resume);

  if (!checked.success) throw badAiResume(checked.error);

  return { parsed, resume };
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

  const response = await withAiRetry(() =>
    client.models.generateContent({
      model: MODEL,
      contents: buildResumePrompt({ portfolio, targetRole, country, experienceLevel }),
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    })
  );

  const { resume } = readAiResume(response.text);

  return normalizeResume(resume, { targetRole, country, experienceLevel }, MODEL);
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

  const response = await withAiRetry(() =>
    client.models.generateContent({
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
    })
  );

  const { parsed } = readAiResume(response.text);

  return normalizeEnhanceResult(
    parsed,
    { targetRole, country, experienceLevel: "Entry Level" },
    MODEL
  );
}
