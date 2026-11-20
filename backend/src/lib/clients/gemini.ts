import { GoogleGenAI } from "@google/genai";
import { config } from "../config";
import { logger } from "../logger";

// Fail a hung Gemini request instead of waiting forever.
export const DEFAULT_TIMEOUT_MS = 30 * 1000;
// Enhancing a whole resume (plus ATS analysis) is slower; that call overrides the default.
export const ENHANCE_TIMEOUT_MS = 120 * 1000;
// One ATS check (resume vs job description), JSON out.
export const ATS_TIMEOUT_MS = 45 * 1000;

if (!config.GEMINI_API_KEY) {
  logger.warn(
    "GEMINI_API_KEY is not configured. Gemini Resume AI will not work."
  );
}

/** The one Gemini SDK client, or null when GEMINI_API_KEY is not set. */
export const gemini: GoogleGenAI | null = config.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: config.GEMINI_API_KEY,
      httpOptions: { timeout: DEFAULT_TIMEOUT_MS },
    })
  : null;
