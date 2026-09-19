const express = require("express");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY;

const GEMINI_MODEL =
  process.env.GEMINI_CHAT_MODEL ||
  "gemini-3.6-flash";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 20;

const RATE_LIMIT_WINDOW_MS =
  60 * 1000;

const RATE_LIMIT_MAX_REQUESTS = 15;

const rateLimitStore = new Map();

/*
|--------------------------------------------------------------------------
| WestForce AI system instruction
|--------------------------------------------------------------------------
*/

const SYSTEM_INSTRUCTION = `
You are WestForce AI, the official AI career assistant for WestForce.

Your purpose is to help website visitors with:

- WestForce services
- Professional portfolio creation
- Resume creation
- AI resume enhancement
- ATS-friendly resume guidance
- Job search
- Canadian career guidance
- Interview preparation
- Cover letters
- Professional profile improvement
- Career planning
- Canadian employment information
- General RCIP-related employment information

ABOUT WESTFORCE:

WestForce is a professional career and portfolio platform.

WestForce can help users with:

- Professional portfolios
- Resume creation
- AI resume enhancement
- ATS-oriented resume improvement
- Professional documents
- Job discovery
- Job applications
- Career guidance
- Candidate profile presentation
- Canadian career opportunities

PORTFOLIOS:

A WestForce portfolio can contain:

- Personal information
- Professional headline
- About section
- Experience
- Education
- Skills
- Certifications
- Professional documents
- Resume
- Professional/social links

The purpose of a WestForce portfolio is to present a candidate professionally to employers.

RESUME GUIDANCE:

When helping with resumes:

- Focus on clarity.
- Focus on measurable achievements.
- Focus on relevant technical skills.
- Recommend ATS-friendly formatting.
- Avoid keyword stuffing.
- Recommend tailoring resumes to specific job descriptions.
- Never invent experience, education, certifications, projects, or achievements.

INTERVIEW PREPARATION:

Help users prepare for:

- Technical interviews
- Behavioral interviews
- HR interviews
- Project explanations
- STAR answers
- Salary discussions
- Questions for interviewers

CANADIAN CAREER GUIDANCE:

Provide general career and employment information.

When discussing Canada:

- Do not invent current job openings.
- Do not guarantee employment.
- Do not guarantee immigration approval.
- Do not guarantee work permits.
- Do not guarantee permanent residence.
- Do not claim that a specific employer participates in an immigration program unless verified.
- Encourage users to verify current immigration requirements through official Canadian government sources.

RCIP:

RCIP refers to the Rural Community Immigration Pilot.

Discuss RCIP only at a general informational level.

Do not make individualized immigration or legal determinations.

Users should verify current eligibility and requirements using official Canadian government information or qualified professionals.

WESTFORCE SUPPORT:

If you do not know whether a particular WestForce feature currently exists, say that feature availability depends on the current platform configuration instead of inventing functionality.

SECURITY:

Never ask users for:

- Passwords
- Firebase credentials
- API keys
- Gemini API keys
- Cloudinary secrets
- Database credentials
- Authentication tokens

STYLE:

- Be professional.
- Be friendly.
- Be concise.
- Use bullet points when useful.
- Use headings when useful.
- Give practical answers.
- Ask a clarifying question when necessary.
- Never claim that an application has been submitted unless an actual application system confirms it.
- Never claim that WestForce guarantees employment.

LEGAL AND IMMIGRATION DISCLAIMER:

For legal or immigration topics, explain that your response is general information and that official Canadian government sources or qualified professionals should be consulted for individual decisions.

You are WestForce AI, not a government immigration officer, lawyer, recruiter, or employer.
`;

/*
|--------------------------------------------------------------------------
| Rate limiting
|--------------------------------------------------------------------------
*/

function getClientIp(req) {
  const forwarded =
    req.headers["x-forwarded-for"];

  if (forwarded) {
    return forwarded
      .split(",")[0]
      .trim();
  }

  return (
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function checkRateLimit(req) {
  const ip = getClientIp(req);

  const now = Date.now();

  const existing =
    rateLimitStore.get(ip);

  if (
    !existing ||
    now - existing.startedAt >=
      RATE_LIMIT_WINDOW_MS
  ) {
    rateLimitStore.set(ip, {
      startedAt: now,
      count: 1,
    });

    return {
      allowed: true,
      retryAfter: 0,
    };
  }

  if (
    existing.count >=
    RATE_LIMIT_MAX_REQUESTS
  ) {
    const retryAfter = Math.ceil(
      (
        RATE_LIMIT_WINDOW_MS -
        (now - existing.startedAt)
      ) / 1000
    );

    return {
      allowed: false,
      retryAfter,
    };
  }

  existing.count += 1;

  return {
    allowed: true,
    retryAfter: 0,
  };
}

/*
|--------------------------------------------------------------------------
| Clean history
|--------------------------------------------------------------------------
*/

function cleanHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  const cleaned = history
    .filter(
      (message) =>
        message &&
        (message.role === "user" ||
          message.role === "model") &&
        typeof message.text === "string" &&
        message.text.trim()
    )
    .map((message) => ({
      role: message.role,
      parts: [
        {
          text: message.text
            .trim()
            .slice(0, MAX_MESSAGE_LENGTH),
        },
      ],
    }));

  /*
   * Gemini conversations should begin
   * with a user message.
   *
   * Remove any leading model messages.
   */
  while (
    cleaned.length > 0 &&
    cleaned[0].role === "model"
  ) {
    cleaned.shift();
  }

  /*
   * Prevent consecutive messages from
   * having the same role.
   *
   * This can happen if a request fails
   * after the user's message was added
   * to the React state.
   */
  const normalized = [];

  for (const item of cleaned) {
    const previous =
      normalized[normalized.length - 1];

    if (
      previous &&
      previous.role === item.role
    ) {
      previous.parts[0].text +=
        `\n\n${item.parts[0].text}`;
    } else {
      normalized.push(item);
    }
  }

  return normalized;
}

/*
|--------------------------------------------------------------------------
| POST /api/chat
|--------------------------------------------------------------------------
*/

router.post("/", async (req, res) => {
  try {
    console.log(
      "\n========================================"
    );

    console.log(
      "WestForce AI request received"
    );

    console.log(
      "========================================"
    );

    /*
    |--------------------------------------------------------------------------
    | Rate limit
    |--------------------------------------------------------------------------
    */

    const rateLimit =
      checkRateLimit(req);

    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        message:
          "Too many requests. Please wait a moment and try again.",
        retryAfter:
          rateLimit.retryAfter,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate API key
    |--------------------------------------------------------------------------
    */

    if (!GEMINI_API_KEY) {
      console.error(
        "ERROR: GEMINI_API_KEY is missing."
      );

      return res.status(500).json({
        success: false,
        message:
          "Gemini API is not configured on the server.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate message
    |--------------------------------------------------------------------------
    */

    const message =
      typeof req.body?.message ===
      "string"
        ? req.body.message.trim()
        : "";

    if (!message) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a message.",
      });
    }

    if (
      message.length >
      MAX_MESSAGE_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Your message is too long. Please keep it under ${MAX_MESSAGE_LENGTH} characters.`,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Conversation history
    |--------------------------------------------------------------------------
    */

    const history =
      cleanHistory(
        req.body?.history
      );

    /*
    |--------------------------------------------------------------------------
    | Build Gemini contents
    |--------------------------------------------------------------------------
    */

    const contents = [
      ...history,

      {
        role: "user",

        parts: [
          {
            text: message,
          },
        ],
      },
    ];

    /*
    |--------------------------------------------------------------------------
    | Gemini REST endpoint
    |--------------------------------------------------------------------------
    */

    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        GEMINI_MODEL
      )}:generateContent`;

    console.log(
      "Gemini model:",
      GEMINI_MODEL
    );

    console.log(
      "Gemini endpoint:",
      endpoint
    );

    /*
    |--------------------------------------------------------------------------
    | Gemini request
    |--------------------------------------------------------------------------
    */

    const geminiResponse =
      await fetch(endpoint, {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "x-goog-api-key":
            GEMINI_API_KEY,
        },

        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text:
                  SYSTEM_INSTRUCTION,
              },
            ],
          },

          contents,
        }),
      });

    /*
    |--------------------------------------------------------------------------
    | Read Gemini response
    |--------------------------------------------------------------------------
    */

    const responseText =
      await geminiResponse.text();

    let geminiData = {};

    try {
      geminiData =
        JSON.parse(responseText);
    } catch {
      geminiData = {};
    }

    /*
    |--------------------------------------------------------------------------
    | Gemini API error
    |--------------------------------------------------------------------------
    */

    if (!geminiResponse.ok) {
      console.error(
        "\n========== GEMINI API ERROR =========="
      );

      console.error(
        "HTTP status:",
        geminiResponse.status
      );

      console.error(
        "Status:",
        geminiResponse.statusText
      );

      console.error(
        "Response:",
        responseText
      );

      console.error(
        "=======================================\n"
      );

      let userMessage =
        "The AI assistant is temporarily unavailable. Please try again.";

      if (
        geminiResponse.status ===
        400
      ) {
        userMessage =
          "Gemini rejected the request. Please check the chatbot configuration.";
      }

      if (
        geminiResponse.status ===
        401
      ) {
        userMessage =
          "The Gemini API key was rejected. Please check your Gemini API key.";
      }

      if (
        geminiResponse.status ===
        403
      ) {
        userMessage =
          "The Gemini API key does not have permission to use this model.";
      }

      if (
        geminiResponse.status ===
        404
      ) {
        userMessage =
          `The Gemini model "${GEMINI_MODEL}" was not found.`;
      }

      if (
        geminiResponse.status ===
        429
      ) {
        userMessage =
          "Gemini API rate limit or quota was reached. Please try again later.";
      }

      return res.status(502).json({
        success: false,
        message: userMessage,

        debug:
          process.env.NODE_ENV !==
          "production"
            ? geminiData
            : undefined,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Extract generated text
    |--------------------------------------------------------------------------
    */

    const generatedText =
      geminiData?.candidates?.[0]
        ?.content?.parts
        ?.map((part) =>
          typeof part?.text ===
          "string"
            ? part.text
            : ""
        )
        .join("")
        .trim();

    /*
    |--------------------------------------------------------------------------
    | Empty response
    |--------------------------------------------------------------------------
    */

    if (!generatedText) {
      console.error(
        "Gemini returned no generated text."
      );

      console.error(
        "Gemini response:",
        JSON.stringify(
          geminiData,
          null,
          2
        )
      );

      return res.status(502).json({
        success: false,
        message:
          "Gemini did not return a response. Please try again.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Success
    |--------------------------------------------------------------------------
    */

    console.log(
      "WestForce AI response generated successfully."
    );

    console.log(
      "========================================\n"
    );

    return res.status(200).json({
      success: true,
      message: generatedText,
      model: GEMINI_MODEL,
    });
  } catch (error) {
    console.error(
      "\n========== WESTFORCE AI SERVER ERROR =========="
    );

    console.error(
      "Name:",
      error?.name
    );

    console.error(
      "Message:",
      error?.message
    );

    console.error(
      "Stack:",
      error?.stack
    );

    console.error(
      "===============================================\n"
    );

    return res.status(500).json({
      success: false,
      message:
        "The AI assistant is temporarily unavailable. Please try again.",

      debug:
        process.env.NODE_ENV !==
        "production"
          ? error?.message
          : undefined,
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET /api/chat/health
|--------------------------------------------------------------------------
*/

router.get(
  "/health",
  (req, res) => {
    return res.status(200).json({
      status: "OK",

      configured:
        Boolean(
          GEMINI_API_KEY
        ),

      model:
        GEMINI_MODEL,
    });
  }
);

module.exports = router;