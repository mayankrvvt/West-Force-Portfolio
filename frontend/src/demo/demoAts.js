/**
 * Demo mode answers for /api/ats/* (check and history). Same shapes as the
 * real backend. Called from demoApi.js; history is kept in demo state.
 */

const daysAgo = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
const clone = (value) => JSON.parse(JSON.stringify(value));

const check = (id, label, weight, points, status, detail, fixes = []) => ({
  id,
  label,
  weight,
  points,
  status,
  detail,
  fixes,
});

/** A realistic breakdown for Emma's PSW resume. `keywordPoints` moves the score. */
function sampleBreakdown(keywordPoints = 28, matchedCount = 8) {
  return [
    check(
      "keywords",
      "Job keywords",
      35,
      keywordPoints,
      keywordPoints >= 24.5 ? "pass" : keywordPoints >= 14 ? "warn" : "fail",
      `Your resume shows ${matchedCount} of 10 key words from the job posting.`,
      [
        "Add these words where they are true for you: hoyer lift, point click care.",
        "Use the same words as the posting. Many systems do not match close wording.",
      ]
    ),
    check("sections", "Standard sections", 15, 15, "pass", "Summary, experience, education and skills are all there."),
    check(
      "bullets",
      "Bullet points",
      15,
      12.5,
      "pass",
      "9 bullets: 89% start with an action word and 33% include a number.",
      ["Add numbers where you can, such as how many clients, hours or dollars."]
    ),
    check(
      "contact",
      "Contact details",
      10,
      9,
      "pass",
      "Missing: LinkedIn.",
      ["Add your LinkedIn profile link."]
    ),
    check(
      "dates",
      "Dates",
      10,
      5,
      "warn",
      "Your dates mix 2 styles: Mon YYYY, MM/YYYY.",
      ["Write every date the same way, such as Jan 2023."]
    ),
    check("length", "Length", 10, 10, "pass", "412 words. A good length for one to two pages."),
    check("readability", "Easy to read", 5, 5, "pass", "Short, clear lines that average 13 words."),
  ];
}

const total = (breakdown) => Math.round(breakdown.reduce((sum, item) => sum + item.points, 0));

const MATCHED = [
  "personal support",
  "personal care",
  "dementia care",
  "cpr",
  "long term care",
  "medication reminders",
  "charting",
  "mobility",
];
const MISSING = ["hoyer lift", "point click care"];

const ADVICE = {
  summary:
    "Your resume fits this personal support worker role well. Your long term care and dementia care work lines up with the main duties. Naming the lift equipment and charting software you know would close the last gaps.",
  suggestions: [
    "Add the lift equipment you have used, such as Hoyer lifts. Add this only if you have real experience with it.",
    "Name the charting software you know, such as Point Click Care.",
    "Put your PSW certificate and CPR date near the top.",
    "Add a number to more bullets, such as residents per shift.",
  ],
};

/** Six past checks, newest first, that climb as the resume improves. */
function sampleHistory() {
  const rows = [
    { days: 1, keywords: 28, matched: 8, job: "Personal support worker", resume: "PSW resume, long term care" },
    { days: 4, keywords: 24.5, matched: 7, job: "Home support worker", resume: "PSW resume, long term care" },
    { days: 8, keywords: 21, matched: 6, job: "Personal support worker, nights", resume: "PSW resume, long term care" },
    { days: 13, keywords: 21, matched: 6, job: "Health care aide", resume: "PSW resume, long term care" },
    { days: 19, keywords: 14, matched: 4, job: "Personal support worker", resume: "Uploaded resume" },
    { days: 26, keywords: 10.5, matched: 3, job: "Community support worker", resume: "Uploaded resume" },
  ];

  return rows.map((row, index) => {
    const breakdown = sampleBreakdown(row.keywords, row.matched);
    return {
      _id: `demo-ats-${index + 1}`,
      score: total(breakdown),
      createdAt: daysAgo(row.days),
      resumeTitle: row.resume,
      jobTitle: row.job,
      breakdown,
    };
  });
}

function firstLine(text = "") {
  const line = String(text).split(/\r?\n/).map((part) => part.trim()).find(Boolean) || "";
  return line.length <= 80 ? line : "";
}

/**
 * Handle a demo /api/ats request. Returns the JSON body the real API sends
 * (with success: true). `parts` is the path split on "/", e.g. ["api", "ats", "check"].
 */
export function handleAts({ method, parts, url, body = {}, state, saveState }) {
  const action = parts[2];

  if (!Array.isArray(state.atsHistory)) {
    state.atsHistory = sampleHistory();
    saveState();
  }

  if (action === "history" && method === "GET") {
    const limit = Math.min(50, Math.max(1, Number(url?.searchParams?.get("limit")) || 20));
    const resumeId = url?.searchParams?.get("resumeId");
    const checks = state.atsHistory
      .filter((item) => !resumeId || item.resumeId === resumeId)
      .slice(0, limit)
      .map(({ _id, score, createdAt, resumeTitle, jobTitle, breakdown }) => ({
        _id,
        score,
        createdAt,
        resumeTitle,
        jobTitle,
        breakdown,
      }));
    return clone({ success: true, checks });
  }

  // POST /api/ats/check
  const breakdown = sampleBreakdown();
  const score = total(breakdown);
  const resume = body.resumeId ? state.resumes?.find((item) => item._id === body.resumeId) : null;
  const entry = {
    _id: `demo-ats-${Date.now()}`,
    resumeId: resume?._id || null,
    score,
    createdAt: new Date().toISOString(),
    resumeTitle: resume?.title || "Uploaded resume",
    jobTitle: body.jobTitle?.trim() || firstLine(body.jobDescription) || "Personal support worker",
    breakdown,
  };

  state.atsHistory.unshift(entry);
  state.atsHistory = state.atsHistory.slice(0, 50);
  if (resume) resume.atsScore = score;
  saveState();

  return clone({
    success: true,
    checkId: entry._id,
    score,
    breakdown,
    keywords: { matched: MATCHED, missing: MISSING, coverage: 0.8 },
    advice: ADVICE,
    matchedKeywords: MATCHED,
    missingKeywords: MISSING,
    suggestions: ADVICE.suggestions,
    summary: ADVICE.summary,
  });
}
