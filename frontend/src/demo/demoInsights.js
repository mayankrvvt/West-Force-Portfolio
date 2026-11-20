/**
 * Demo mode for portfolio view insights, plus the demo PIN check.
 * Wired into demoApi.js as `case "insights"`. Fixed sample numbers so the
 * chart looks the same on every load.
 */

const DAY_MS = 86400000;
const DEFAULT_DAYS = 30;
const DEMO_PIN = "123456";
const DEMO_PIN_TRIES = 5;
const DEMO_LOCK_SECONDS = 60;

// Oldest first. Index 29 is today.
const VIEWS = [
  0, 1, 0, 2, 1, 0, 0, 3, 2, 1, 4, 2, 0, 1, 5, 3, 2, 0, 1, 6, 4, 2, 3, 1, 0, 7, 5, 3, 4, 2,
];
const UNLOCKS = [
  0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 2, 1, 0, 0, 0, 2, 1, 0, 1, 0, 0, 2, 1, 1, 1, 0,
];
const DOCUMENT_OPENS = [9, 6, 3];
const RECENT = [
  { type: "view", documentIndex: null, hoursAgo: 2 },
  { type: "document", documentIndex: 0, hoursAgo: 26 },
  { type: "unlock", documentIndex: null, hoursAgo: 27 },
  { type: "view", documentIndex: null, hoursAgo: 28 },
  { type: "document", documentIndex: 1, hoursAgo: 50 },
  { type: "unlock", documentIndex: null, hoursAgo: 51 },
  { type: "view", documentIndex: null, hoursAgo: 75 },
];

const clone = (value) => JSON.parse(JSON.stringify(value));
const ok = (payload = {}) => ({ success: true, ...clone(payload) });
const utcDay = (date) => date.toISOString().slice(0, 10);
const hoursAgo = (hours) => new Date(Date.now() - hours * 3600000).toISOString();

function clampDays(value) {
  const days = Number.parseInt(value, 10);
  if (!Number.isFinite(days)) return DEFAULT_DAYS;
  return Math.min(90, Math.max(1, days));
}

function sampleInsights(days, documents) {
  const today = Date.now();
  const daily = Array.from({ length: days }, (_, index) => {
    const back = days - 1 - index; // days before today
    const sample = VIEWS.length - 1 - back;
    return {
      day: utcDay(new Date(today - back * DAY_MS)),
      views: sample >= 0 ? VIEWS[sample] : 0,
      unlocks: sample >= 0 ? UNLOCKS[sample] : 0,
    };
  });

  const opened = documents.slice(0, DOCUMENT_OPENS.length).map((document, index) => ({
    documentId: String(document._id),
    name: document.name,
    opens: DOCUMENT_OPENS[index],
    lastOpenedAt: hoursAgo(26 + index * 24),
  }));

  const recent = RECENT.map((item) => ({
    type: item.type,
    documentName: item.documentIndex === null ? null : opened[item.documentIndex]?.name || null,
    at: hoursAgo(item.hoursAgo),
  })).filter((item) => item.type !== "document" || item.documentName);

  const views = daily.reduce((sum, row) => sum + row.views, 0);

  return {
    totals: {
      views,
      uniqueVisitors: views,
      unlocks: daily.reduce((sum, row) => sum + row.unlocks, 0),
      documentOpens: opened.reduce((sum, row) => sum + row.opens, 0),
    },
    daily,
    documents: opened,
    recent,
  };
}

/**
 * Handles /api/insights/*. Returns undefined for anything it does not know,
 * so demoApi.js can fall through to its default.
 */
// eslint-disable-next-line no-unused-vars
export function handleInsights({ method, parts, url, body, state, jobs, saveState }) {
  if (parts[1] !== "insights") return undefined;

  // GET /api/insights/me?days=30
  if (parts[2] === "me" && parts.length === 3 && method === "GET") {
    const days = clampDays(url.searchParams.get("days"));
    const documents = Array.isArray(state?.portfolio?.documents) ? state.portfolio.documents : [];
    return ok(sampleInsights(days, documents));
  }

  // POST /api/insights/portfolios/:slug/view: nothing to count in demo mode.
  if (parts[2] === "portfolios" && parts[4] === "view" && parts.length === 5 && method === "POST") {
    return ok({ recorded: false });
  }

  return undefined;
}

/* ---------------- demo PIN check ---------------- */

let triesLeft = DEMO_PIN_TRIES;
let lockedUntil = 0;

/**
 * Stands in for the unlock-documents fetch in demo mode. Returns a small
 * fetch-like response so the caller's normal status handling runs:
 * 123456 unlocks, other PINs get the usual wrong-PIN answer, and five
 * wrong tries pause for a minute.
 */
export function demoUnlockResponse(pin) {
  const respond = (status, payload) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => clone(payload),
  });

  const now = Date.now();
  if (lockedUntil > now) {
    const retryAfter = Math.ceil((lockedUntil - now) / 1000);
    return respond(429, {
      success: false,
      message: `Too many incorrect PIN attempts. Try again in ${retryAfter} seconds.`,
      retryAfter,
    });
  }

  if (String(pin) === DEMO_PIN) {
    triesLeft = DEMO_PIN_TRIES;
    return respond(200, {
      success: true,
      message: "Documents unlocked.",
      unlocked: true,
      expiresIn: 15 * 60 * 1000,
    });
  }

  triesLeft -= 1;
  if (triesLeft <= 0) {
    triesLeft = DEMO_PIN_TRIES;
    lockedUntil = now + DEMO_LOCK_SECONDS * 1000;
    return respond(429, {
      success: false,
      message: `Too many incorrect PIN attempts. Try again in ${DEMO_LOCK_SECONDS} seconds.`,
      retryAfter: DEMO_LOCK_SECONDS,
    });
  }

  return respond(401, { success: false, message: "Incorrect PIN.", attemptsRemaining: triesLeft });
}
