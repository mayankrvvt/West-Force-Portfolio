import { isTransientStatus, withAiRetry } from "../../lib/aiRetry";
import { DEFAULT_TIMEOUT_MS } from "../../lib/clients/gemini";
import { config } from "../../lib/config";
import { MAX_HISTORY_MESSAGES, MAX_MESSAGE_LENGTH } from "./schema";
import { SYSTEM_INSTRUCTION } from "./prompt";

export type GeminiContent = { role: "user" | "model"; parts: [{ text: string }] };

/**
 * Turn the client's history into Gemini contents: last 20 messages, only
 * non-empty user/model texts, no leading model message, and consecutive
 * same-role messages merged (a failed request can leave two user turns).
 */
type ChatTurn = { role: "user" | "model"; text: string };

function isChatTurn(value: unknown): value is ChatTurn {
  if (typeof value !== "object" || value === null) return false;
  const { role, text } = value as { role?: unknown; text?: unknown };
  return (role === "user" || role === "model") && typeof text === "string" && Boolean(text.trim());
}

export function cleanHistory(history: unknown): GeminiContent[] {
  if (!Array.isArray(history)) return [];

  const cleaned: GeminiContent[] = (history as unknown[])
    .slice(-MAX_HISTORY_MESSAGES)
    .filter(isChatTurn)
    .map((message) => ({
      role: message.role,
      parts: [{ text: message.text.trim().slice(0, MAX_MESSAGE_LENGTH) }],
    }));

  while (cleaned.length > 0 && cleaned[0]?.role === "model") {
    cleaned.shift();
  }

  const normalized: GeminiContent[] = [];

  for (const item of cleaned) {
    const previous = normalized[normalized.length - 1];
    if (previous && previous.role === item.role) {
      previous.parts[0].text += `\n\n${item.parts[0].text}`;
    } else {
      normalized.push(item);
    }
  }

  return normalized;
}

export function buildContents(message: string, history: unknown): GeminiContent[] {
  return [...cleanHistory(history), { role: "user", parts: [{ text: message }] }];
}

export type GeminiReply =
  | { ok: true; text: string }
  | { ok: false; reason: "http"; status: number; data: unknown }
  | { ok: false; reason: "empty"; data: unknown };

/**
 * Call the Gemini REST API, once more after a short wait on a 429, 5xx,
 * network error or timeout (see withAiRetry). Throws on network errors and on
 * timeout (a DOMException named "TimeoutError" after DEFAULT_TIMEOUT_MS).
 */
export function generateReply(contents: GeminiContent[], apiKey: string): Promise<GeminiReply> {
  return withAiRetry(() => requestReply(contents, apiKey), {
    retryResult: (reply) => !reply.ok && reply.reason === "http" && isTransientStatus(reply.status),
  });
}

/** One Gemini REST call. */
async function requestReply(contents: GeminiContent[], apiKey: string): Promise<GeminiReply> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    config.GEMINI_CHAT_MODEL
  )}:generateContent`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents,
    }),
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  });

  const responseText = await response.text();
  let data: unknown = {};
  try {
    data = JSON.parse(responseText);
  } catch {
    data = {};
  }

  if (!response.ok) {
    return { ok: false, reason: "http", status: response.status, data };
  }

  const parts = (data as { candidates?: { content?: { parts?: { text?: unknown }[] } }[] })
    ?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.map((part) => (typeof part?.text === "string" ? part.text : "")).join("").trim()
    : "";

  return text ? { ok: true, text } : { ok: false, reason: "empty", data };
}

/** The message shown to the user for a Gemini HTTP error. */
export function geminiErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return "Gemini rejected the request. Please check the chatbot configuration.";
    case 401:
      return "The Gemini API key was rejected. Please check your Gemini API key.";
    case 403:
      return "The Gemini API key does not have permission to use this model.";
    case 404:
      return `The Gemini model "${config.GEMINI_CHAT_MODEL}" was not found.`;
    case 429:
      return "Gemini API rate limit or quota was reached. Please try again later.";
    default:
      return "The AI assistant is temporarily unavailable. Please try again.";
  }
}
