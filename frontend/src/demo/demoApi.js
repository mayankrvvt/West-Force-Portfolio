/**
 * Local-dev-only mock API for demo mode (see demoMode.js).
 *
 * Loaded with a dynamic import() from utils/api.js only when DEMO_MODE is on,
 * so none of this ships in a production build. No network calls, no emails.
 * State lives in localStorage so portfolio edits survive a reload.
 */
import { DEMO_STATE_KEY as STATE_KEY, DEMO_USER } from "./demoMode";
import { handleTailor } from "./demoTailor";
import { handleAts } from "./demoAts";
import { handleInsights } from "./demoInsights";

const SLUG = "emma-tremblay";

const daysAgo = (days) =>
  new Date(Date.now() - days * 86400000).toISOString();

const certificate = (id, name, size) => ({
  _id: id,
  name,
  type: "certificate",
  format: "pdf",
  mimeType: "application/pdf",
  fileUrl: "",
  size,
  protected: true,
});

function samplePortfolio() {
  return {
    _id: "demo-portfolio-1",
    userId: "demo-user-1",
    slug: SLUG,
    status: "published",
    template: "default",
    publishedAt: daysAgo(20),
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
    profile: {
      name: "Emma Tremblay",
      title: "Personal support worker",
      location: "Brampton, ON",
      email: DEMO_USER.email,
      phone: "(555) 010-0199",
      imageUrl: "",
      availableForWork: true,
      availability: {
        jobTypes: ["full_time"],
        shifts: ["days", "evenings"],
        startDate: "now",
      },
      workArea: "Peel and Toronto",
      travel: { willing: true, ownCar: true },
      languages: ["en", "fr"],
      driversLicence: "G",
    },
    hero: {
      greeting: "Hello, I'm",
      headline: "Personal support worker, Brampton, ON",
      description:
        "Caring, reliable PSW with six years of home and long-term care experience. Calm in busy shifts and trusted by families.",
    },
    about: {
      title: "About me",
      description:
        "I help seniors and people with disabilities live safely and with dignity. I speak English and French, and I hold a valid Ontario PSW certificate.\n\nOver six years I have worked in long-term care, home care and a retirement residence. Families tell me they value how I keep them updated, and nurses trust my care notes. I am looking for a full-time PSW role in Peel or Toronto, days or evenings.",
      // Local sample files in frontend/public
      videoUrl: "/demo.mp4",
      poster: "/demo-poster.jpg",
      videoPublicId: "demo-intro-video",
      videoStatus: "uploaded",
      videoDurationSeconds: 84, // 1 min 24 s
    },
    experience: [
      {
        company: "Maple Grove Long-Term Care",
        position: "Personal support worker",
        location: "Brampton, ON",
        startDate: "2023-03",
        endDate: "",
        isCurrent: true,
        description:
          "Daily care for 14 residents, mobility help, meal support and care notes.",
        order: 0,
      },
      {
        company: "Peel Home Care Services",
        position: "Home support worker",
        location: "Mississauga, ON",
        startDate: "2021-01",
        endDate: "2023-02",
        isCurrent: false,
        description:
          "Visited clients at home for bathing, medication reminders and light housekeeping.",
        order: 1,
      },
      {
        company: "Sunrise Retirement Residence",
        position: "Care aide",
        location: "Toronto, ON",
        startDate: "2019-06",
        endDate: "2020-12",
        isCurrent: false,
        description:
          "Supported residents with daily living and joined recreation programs.",
        order: 2,
      },
      {
        company: "City Community Hospital",
        position: "Patient care volunteer",
        location: "Toronto, ON",
        startDate: "2018-09",
        endDate: "2019-05",
        isCurrent: false,
        description: "Helped nurses with patient comfort rounds and visitor guidance.",
        order: 3,
      },
    ],
    education: [
      {
        institution: "Sheridan College",
        degree: "Personal Support Worker certificate",
        fieldOfStudy: "Health care",
        startYear: "2018",
        endYear: "2019",
        year: "2019",
        description: "Placement at a long-term care home, 300 hours.",
        order: 0,
      },
      {
        institution: "Canadian Red Cross",
        degree: "Standard first aid and CPR level C",
        fieldOfStudy: "First aid",
        startYear: "2024",
        endYear: "2024",
        year: "2024",
        description: "Renewed every three years.",
        order: 1,
      },
    ],
    skills: [
      "Personal care",
      "Mobility and transfers",
      "Dementia care",
      "Medication reminders",
      "Meal preparation",
      "Infection control",
      "First aid and CPR",
      "Care documentation",
      "Palliative support",
      "Family communication",
      "Time management",
      "English and French",
    ].map((name, index) => ({ name, level: 90 - (index % 4) * 5, order: index })),
    documents: [
      certificate("demo-doc-1", "Ontario PSW certificate", 412000),
      certificate("demo-doc-2", "First aid and CPR level C", 238000),
      certificate("demo-doc-3", "Safe food handling", 196000),
      {
        _id: "demo-doc-5",
        name: "References",
        type: "reference",
        format: "pdf",
        mimeType: "application/pdf",
        fileUrl: "",
        size: 121000,
        protected: true,
      },
    ],
    resume: {
      name: "Emma-Tremblay-Resume.pdf",
      fileUrl: "",
      // No fileUrl, so the page links straight to this sample file
      url: "/demo-resume.pdf",
      format: "pdf",
      mimeType: "application/pdf",
      pages: 2,
    },
    socialLinks: { linkedin: "", github: "", website: "", instagram: "" },
    documentProtection: { enabled: true, pinLength: 6 },
  };
}

function sampleState() {
  return {
    portfolio: samplePortfolio(),
    applications: [
      {
        _id: "demo-app-1",
        company: "Brampton Seniors Village",
        role: "Personal support worker",
        location: "Brampton, ON",
        status: "Interview",
        url: "",
        appliedAt: daysAgo(6),
        updatedAt: daysAgo(2),
      },
      {
        _id: "demo-app-2",
        company: "CarePoint Home Health",
        role: "Home support worker",
        location: "Mississauga, ON",
        status: "Applied",
        url: "",
        appliedAt: daysAgo(3),
        updatedAt: daysAgo(3),
      },
    ],
    resumes: [
      {
        _id: "demo-resume-1",
        title: "PSW resume, long-term care",
        targetRole: "Personal support worker",
        atsScore: 82,
        createdAt: daysAgo(12),
        updatedAt: daysAgo(4),
        content: sampleResumeContent(),
      },
    ],
  };
}

function sampleResumeContent() {
  const p = samplePortfolio();
  return {
    name: p.profile.name,
    title: p.profile.title,
    email: p.profile.email,
    phone: p.profile.phone,
    location: p.profile.location,
    summary: p.hero.description,
    experience: p.experience.map((item, index) => ({
      id: `exp-${index}`,
      company: item.company,
      position: item.position,
      location: item.location,
      startDate: item.startDate,
      endDate: item.endDate || "Present",
      bullets: [item.description],
    })),
    education: p.education.map((item, index) => ({ id: `edu-${index}`, ...item })),
    skills: p.skills.map((skill) => skill.name),
    projects: [],
    certifications: p.documents
      .filter((doc) => doc.type === "certificate")
      .map((doc) => ({ id: doc._id, name: doc.name, issuer: "", year: "" })),
  };
}

const JOBS = [
  {
    _id: "demo-job-1",
    title: "Personal support worker",
    company: "Brampton Seniors Village",
    location: "Brampton, ON",
    type: "Full-time",
    description: "Provide daily care to residents in a 120-bed home. PSW certificate required.",
    tags: ["PSW", "Long-term care"],
    url: "",
    postedAt: daysAgo(2),
  },
  {
    _id: "demo-job-2",
    title: "Home support worker",
    company: "CarePoint Home Health",
    location: "Mississauga, ON",
    type: "Part-time",
    description: "Visit clients at home. Car and valid driver's licence an asset.",
    tags: ["Home care"],
    url: "",
    postedAt: daysAgo(4),
  },
  {
    _id: "demo-job-3",
    title: "Resident care aide",
    company: "Lakeview Retirement Living",
    location: "Toronto, ON",
    type: "Full-time",
    description: "Support residents with daily living. Night shifts available.",
    tags: ["Retirement home"],
    url: "",
    postedAt: daysAgo(7),
  },
  {
    _id: "demo-job-4",
    title: "Dementia care aide",
    company: "Peel Memory Care",
    location: "Brampton, ON",
    type: "Full-time",
    description: "Personal care and medication reminders for seniors living with dementia. First aid and CPR required.",
    tags: ["Dementia care"],
    url: "",
    postedAt: daysAgo(1),
  },
];

/* ---------------- jobs for you ---------------- */

const PROVINCE_NAMES = { AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick", NL: "Newfoundland and Labrador", NS: "Nova Scotia", NT: "Northwest Territories", NU: "Nunavut", ON: "Ontario", PE: "Prince Edward Island", QC: "Quebec", SK: "Saskatchewan", YT: "Yukon" };

const pick = (source, keys) => Object.fromEntries(keys.filter((key) => source?.[key] !== undefined).map((key) => [key, source[key]]));

function jobPreferences(state) {
  return state.jobPreferences || { titles: ["Personal support worker", "Home support worker"], city: "Brampton", province: "ON", remoteOk: false };
}

// A small copy of backend/src/modules/jobs/match.ts, enough for the demo.
const words = (text) => ` ${String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").map((w) => (w.length > 3 ? w.replace(/s$/, "") : w)).join(" ")} `;
const hasPhrase = (text, phrase) => phrase.trim() !== "" && text.includes(phrase);

function jobsForMe(state) {
  const prefs = jobPreferences(state);
  const resume = state.resumes[0];
  const titles = [...(prefs.titles || []), resume?.targetRole].filter(Boolean);
  const skills = [...new Set([...(resume?.content?.skills || []), ...(state.portfolio?.skills || []).map((s) => s.name || s)])];
  if (!titles.length && !skills.length) return [];
  const hidden = new Set(state.hiddenJobIds || []);

  return JOBS.filter((job) => !hidden.has(job._id)).map((job) => {
    const title = words(job.title);
    const best = titles
      .map((t) => {
        const need = words(t).trim().split(" ");
        const hit = need.filter((w) => title.includes(` ${w} `)).length;
        return { t, points: hit === need.length ? 40 : Math.round((25 * hit) / need.length) };
      })
      .sort((a, b) => b.points - a.points)[0] || { points: 0 };
    const skillHits = skills
      .map((skill) => {
        const phrase = words(skill);
        const points = hasPhrase(title, phrase) ? 4 : job.tags.some((tag) => hasPhrase(words(tag), phrase)) ? 3 : hasPhrase(words(job.description), phrase) ? 2 : 0;
        return { skill, points };
      })
      .filter((hit) => hit.points)
      .sort((a, b) => b.points - a.points);
    const skillPoints = Math.min(12, skillHits.reduce((sum, hit) => sum + hit.points, 0));
    if (!best.points && !skillPoints) return null;

    const location = job.location.toLowerCase();
    const place = prefs.city && location.includes(prefs.city.toLowerCase()) ? { points: 15, reason: prefs.city }
      : prefs.province && location.endsWith(`, ${prefs.province.toLowerCase()}`) ? { points: 8, reason: PROVINCE_NAMES[prefs.province] }
      : prefs.remoteOk && location.includes("remote") ? { points: 6, reason: "Remote" }
      : { points: 0, reason: "" };
    const age = Date.now() - new Date(job.postedAt).getTime();
    const fresh = age <= 3 * 86400000 ? 3 : age <= 14 * 86400000 ? 1 : 0;
    const reasons = [
      best.points ? `Title match: ${best.t}` : "",
      skillHits.length ? `Matches: ${skillHits.slice(0, 3).map((hit) => hit.skill).join(", ")}` : "",
      place.reason,
    ].filter(Boolean);
    return { ...job, score: best.points + skillPoints + place.points + fresh, reasons, isNew: fresh === 3 };
  })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

/* ---------------- state ---------------- */

// localStorage is the source of truth (sign-out clears it); memory is only a
// fallback when storage is blocked.
let memoryState = null;

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    memoryState = raw ? JSON.parse(raw) : sampleState();
  } catch {
    memoryState = memoryState || sampleState();
  }
  return memoryState;
}

function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(memoryState));
  } catch {
    /* storage full or blocked: keep in memory */
  }
}

/* ---------------- helpers ---------------- */

const clone = (value) => JSON.parse(JSON.stringify(value));
const ok = (payload = {}) => ({ success: true, ...clone(payload) });

function demoError(status, message, code = "") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  error.data = { success: false, message, ...(code ? { code } : {}) };
  return error;
}

function parseBody(body) {
  if (!body || body instanceof FormData) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body;
}

function publicView(portfolio) {
  return {
    ...portfolio,
    documents: portfolio.documents.map(({ _id, name, type, format, size, protected: isProtected }) => ({
      _id,
      name,
      type: type || format || "Document",
      size: size || 0,
      protected: isProtected !== false,
    })),
  };
}

function summary(state) {
  const count = (status) => state.applications.filter((a) => a.status === status).length;
  const resumes = [...state.resumes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    stats: {
      resumes: resumes.length,
      applications: state.applications.length,
      interviews: count("Interview"),
      savedJobs: count("Saved"),
      latestAtsScore: resumes.find((r) => typeof r.atsScore === "number")?.atsScore ?? null,
    },
    recentResumes: resumes.slice(0, 3),
    recentApplications: state.applications.slice(0, 5),
    recommendedJobs: JOBS.slice(0, 3),
  };
}

const delay = () => new Promise((resolve) => setTimeout(resolve, 150));

/* ---------------- admin jobs ---------------- */

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

function sampleAdminJobs() {
  return [
    {
      _id: "demo-admin-job-1",
      title: "Personal support worker",
      company: "Peel Community Care",
      location: "Brampton, ON",
      type: "Full time",
      salaryMin: 42000,
      salaryMax: 48000,
      description: "Help clients at home with daily living. Day and evening shifts.",
      url: "https://example.com/jobs/psw",
      tags: ["Healthcare", "Home care"],
      hidden: false,
      expiresAt: daysFromNow(45),
      postedAt: daysAgo(15),
      applicationCount: 2,
    },
    {
      _id: "demo-admin-job-2",
      title: "Recreation aide",
      company: "Maple Grove Seniors Residence",
      location: "Mississauga, ON",
      type: "Part time",
      salaryMin: null,
      salaryMax: null,
      description: "Plan and run activities for residents.",
      url: "",
      tags: ["Seniors"],
      hidden: true,
      expiresAt: null,
      postedAt: daysAgo(30),
      applicationCount: 0,
    },
  ];
}

// Same rules the server checks, so errors show up inline in demo mode too.
function adminJobProblem(job) {
  if (!String(job.title || "").trim()) return "Title is required.";
  if (!String(job.company || "").trim()) return "Company is required.";
  if (!String(job.location || "").trim()) return "Location is required and must be in Canada.";
  if (job.url && !/^https:\/\//i.test(job.url)) return "The job link must use https.";
  if ((job.tags || []).length > 10) return "Use 10 tags at most.";
  if (job.salaryMin != null && job.salaryMax != null && job.salaryMin > job.salaryMax) return "Salary minimum can't be more than the maximum.";
  return "";
}

/* ---------------- admin portal and site settings ---------------- */

// The real owners. On the live site this list comes from ADMIN_EMAILS on Render.
const DEMO_OWNERS = ["mynkrvvt@gmail.com", "rdx10110@gmail.com"];

function defaultSiteSettings() {
  return {
    maintenance: { on: false, message: "" },
    banner: { on: false, text: "", tone: "info" },
    features: { signups: true, payments: true, ai: true, jobs: true },
    updatedBy: null,
    updatedAt: null,
  };
}

function siteSettings(state) {
  if (!state.siteSettings) state.siteSettings = defaultSiteSettings();
  return state.siteSettings;
}

function sampleAdmins() {
  return DEMO_OWNERS.map((email) => ({ email, owner: true, addedBy: null, createdAt: null }));
}

function sampleActivity() {
  return [
    { _id: "demo-activity-2", actorEmail: DEMO_OWNERS[0], action: "settings.update", target: "site", details: { changes: { "banner.on": true, "banner.text": "Holiday hours: support replies may be slow." } }, at: daysAgo(1) },
    { _id: "demo-activity-1", actorEmail: DEMO_OWNERS[0], action: "job.create", target: "demo-admin-job-1", details: { title: "Personal support worker", company: "Peel Home Care" }, at: daysAgo(14) },
  ];
}

function logDemoActivity(state, action, target, details = {}) {
  if (!state.adminActivity) state.adminActivity = sampleActivity();
  state.adminActivity.unshift({
    _id: `demo-activity-${Date.now()}`,
    actorEmail: DEMO_USER.email,
    action,
    target,
    details,
    at: new Date().toISOString(),
  });
}

const SETTING_LIMITS = { "maintenance.message": 300, "banner.text": 200 };

function handleSettings(method, body, state) {
  const settings = siteSettings(state);
  if (method === "GET") return ok({ settings });

  const changes = {};
  for (const group of ["maintenance", "banner", "features"]) {
    for (const [key, value] of Object.entries(body[group] || {})) {
      if (!(key in settings[group])) throw demoError(400, `Unknown setting: ${key}.`);
      const next = typeof value === "string" ? value.trim() : value;
      const limit = SETTING_LIMITS[`${group}.${key}`];
      if (limit && String(next).length > limit) throw demoError(400, `That text must be at most ${limit} characters.`);
      changes[`${group}.${key}`] = next;
      settings[group][key] = next;
    }
  }
  if (!Object.keys(changes).length) throw demoError(400, "Nothing to update.");

  settings.updatedBy = DEMO_USER.email;
  settings.updatedAt = new Date().toISOString();
  logDemoActivity(state, "settings.update", "site", { changes });
  saveState();
  return ok({ settings });
}

function handleAdmins(method, sub, body, state) {
  if (!state.admins) state.admins = sampleAdmins();
  const admins = state.admins;

  if (!sub) {
    if (method === "GET") return ok({ admins });
    const email = String(body.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw demoError(400, "Enter a valid email.");
    if (admins.some((admin) => admin.email === email)) throw demoError(409, "That person is already an admin.", "ALREADY_ADMIN");
    const admin = { email, owner: false, addedBy: DEMO_USER.email, createdAt: new Date().toISOString() };
    admins.push(admin);
    logDemoActivity(state, "admin.add", email);
    saveState();
    return ok({ admin });
  }

  const email = decodeURIComponent(sub).toLowerCase();
  const index = admins.findIndex((admin) => admin.email === email);
  if (index < 0) throw demoError(404, "Admin not found.");
  if (admins[index].owner) throw demoError(403, "Owners can't be removed.");
  admins.splice(index, 1);
  logDemoActivity(state, "admin.remove", email);
  saveState();
  return ok({ message: "Admin removed." });
}

function handleActivity(url, state) {
  if (!state.adminActivity) state.adminActivity = sampleActivity();
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const items = state.adminActivity.slice((page - 1) * 50, page * 50);
  return ok({ items, total: state.adminActivity.length });
}

/** Mirrors the server's feature switches: 503 FEATURE_OFF when one is off. */
function checkFeature(state, feature, message) {
  if (siteSettings(state).features[feature] === false) throw demoError(503, message, "FEATURE_OFF");
}

function handleAdmin({ method, id, sub, body, state, url }) {
  if (id === "me") return ok({ isAdmin: true, isOwner: true });
  if (id === "admins") return handleAdmins(method, sub, body, state);
  if (id === "settings") return handleSettings(method, body, state);
  if (id === "activity") return handleActivity(url, state);
  if (id !== "jobs") throw demoError(404, "API route not found.");
  if (!state.adminJobs) state.adminJobs = sampleAdminJobs();
  const jobs = state.adminJobs;

  if (!sub) {
    if (method === "GET") return ok({ jobs });
    const job = {
      title: "", company: "", location: "", type: "", salaryMin: null, salaryMax: null,
      description: "", url: "", tags: [], hidden: false, expiresAt: daysFromNow(60),
      ...body,
      _id: `demo-admin-job-${Date.now()}`,
      postedAt: new Date().toISOString(),
      applicationCount: 0,
    };
    const problem = adminJobProblem(job);
    if (problem) throw demoError(400, problem);
    jobs.unshift(job);
    logDemoActivity(state, "job.create", job._id, { title: job.title, company: job.company });
    saveState();
    return ok({ message: "Job created.", job });
  }

  const index = jobs.findIndex((job) => job._id === sub);
  if (index < 0) throw demoError(404, "Job not found.");

  if (method === "DELETE") {
    const [removed] = jobs.splice(index, 1);
    logDemoActivity(state, "job.delete", removed._id, { title: removed.title, company: removed.company });
    saveState();
    return ok({ message: "Job deleted." });
  }

  const updated = { ...jobs[index], ...body };
  const problem = adminJobProblem(updated);
  if (problem) throw demoError(400, problem);
  jobs[index] = updated;
  logDemoActivity(state, "job.update", updated._id, { fields: Object.keys(body) });
  saveState();
  return ok({ message: "Job updated.", job: updated });
}

/* ---------------- request handler ---------------- */

/** Mock for apiRequest/publicApiRequest. Returns the parsed JSON body or throws like the real helper. */
export async function demoRequest(endpoint, options = {}) {
  await delay();

  const state = loadState();
  const method = String(options.method || "GET").toUpperCase();
  const url = new URL(endpoint, "http://demo.local");
  const path = url.pathname.replace(/\/+$/, "");
  const body = parseBody(options.body);
  const parts = path.split("/").filter(Boolean); // ["api", "portfolios", ...]
  const [, resource, id, sub] = parts;

  switch (resource) {
    case "portfolios": {
      if (id === "me" && !sub) {
        if (method === "GET") return ok({ portfolio: state.portfolio });
        if (method === "DELETE") {
          return ok({ message: "Demo mode: delete skipped." });
        }
        // PUT: merge edits and persist
        const { documentProtection, ...rest } = body;
        state.portfolio = {
          ...state.portfolio,
          ...rest,
          slug: rest.slug || state.portfolio.slug,
          updatedAt: new Date().toISOString(),
          documentProtection: documentProtection
            ? { enabled: Boolean(documentProtection.enabled), pinLength: documentProtection.pin?.length || state.portfolio.documentProtection.pinLength || 6 }
            : state.portfolio.documentProtection,
        };
        saveState();
        return ok({ message: "Portfolio updated successfully.", portfolio: state.portfolio });
      }

      if (!id && method === "POST") {
        state.portfolio = { ...state.portfolio, ...body, updatedAt: new Date().toISOString() };
        saveState();
        return ok({ message: "Portfolio created successfully.", portfolio: state.portfolio });
      }

      if (id === "me" && sub === "documents") {
        const type = url.searchParams.get("type");
        const documents = state.portfolio.documents.filter((doc) => !type || doc.type === type);
        return ok({ documents });
      }

      if (id === "me" && sub === "document-protection") {
        const enabled = Boolean(body.enabled);
        state.portfolio.documentProtection = {
          enabled,
          pinLength: enabled ? String(body.pin || "").length || 6 : null,
        };
        saveState();
        return ok({
          message: enabled ? "Document protection enabled." : "Document protection disabled.",
          documentProtection: { enabled },
        });
      }

      if (id && sub === "unlock-documents") {
        return ok({ message: "Documents unlocked.", unlocked: true, expiresIn: 1800000 });
      }

      if (id && !sub && method === "GET") {
        const p = state.portfolio;
        if (decodeURIComponent(id) === p.slug && p.status === "published") {
          return ok({ portfolio: publicView(p) });
        }
        throw demoError(404, "Published portfolio not found.");
      }
      break;
    }

    case "dashboard":
      return ok(summary(state));

    case "payments":
      if (id === "me") {
        return ok({ isPaid: true, plan: "solo", email: DEMO_USER.email, emailVerificationRequired: false });
      }
      if (id === "confirm") return ok({ isPaid: true, plan: "solo" });
      if (id === "checkout") checkFeature(state, "payments", "Payments are paused for now. Please try again later.");
      if (id === "checkout") throw demoError(409, "Demo mode: you already have an active plan.");
      break;

    case "users": {
      if (id === "me" && sub === "job-preferences") {
        const current = jobPreferences(state);
        if (method === "PUT") {
          state.jobPreferences = { ...current, ...pick(body, ["titles", "city", "province", "remoteOk", "weeklyEmail"]) };
          saveState();
          return ok({ message: "Job preferences saved.", jobPreferences: state.jobPreferences });
        }
        return ok({ jobPreferences: current });
      }
      const user = {
        _id: "demo-user-1",
        firebaseUid: DEMO_USER.uid,
        email: DEMO_USER.email,
        fullName: "Emma Tremblay",
        isPaid: true,
        onboardingCompleted: true,
      };
      return ok({ user });
    }

    case "applications": {
      if (!id) {
        if (method === "GET") return ok({ applications: state.applications });
        const job = body.jobId ? JOBS.find((j) => j._id === body.jobId) : null;
        const existing = job && state.applications.find((a) => a.jobId === job._id);
        if (existing) return ok({ message: "Application already saved.", application: existing, created: false });
        const application = {
          _id: `demo-app-${Date.now()}`,
          jobId: job?._id,
          company: job?.company || body.company || "",
          role: job?.title || body.role || "",
          location: job?.location || body.location || "",
          url: body.url || "",
          notes: body.notes || "",
          status: body.status || "Saved",
          appliedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.applications.unshift(application);
        saveState();
        return ok({ message: "Application saved.", application, created: true });
      }
      const index = state.applications.findIndex((a) => a._id === id);
      if (index < 0) throw demoError(404, "Application not found.");
      if (method === "DELETE") {
        state.applications.splice(index, 1);
        saveState();
        return ok({ message: "Application deleted." });
      }
      state.applications[index] = {
        ...state.applications[index],
        ...(sub === "status" ? { status: body.status } : body),
        updatedAt: new Date().toISOString(),
      };
      saveState();
      return ok({ message: "Application updated.", application: state.applications[index] });
    }

    case "admin":
      return handleAdmin({ method, id, sub, body, state, url });

    case "site": {
      const { maintenance, banner, features } = siteSettings(state);
      return ok({ maintenance, banner, features });
    }

    case "jobs": {
      checkFeature(state, "jobs", "Job search is paused for now. Please try again later.");
      if (id === "for-me") return ok({ jobs: jobsForMe(state) });
      if (id && sub === "hide") {
        if (!JOBS.some((j) => j._id === id)) throw demoError(404, "Job not found.");
        const others = (state.hiddenJobIds || []).filter((hiddenId) => hiddenId !== id);
        state.hiddenJobIds = method === "DELETE" ? others : [...others, id].slice(-500);
        saveState();
        return ok({ hidden: method !== "DELETE" });
      }
      if (id) {
        const job = JOBS.find((j) => j._id === id);
        if (!job) throw demoError(404, "Job not found.");
        return ok({ job });
      }
      const query = (url.searchParams.get("query") || "").toLowerCase();
      const location = (url.searchParams.get("location") || "").toLowerCase();
      const jobs = JOBS.filter(
        (j) =>
          (!query || `${j.title} ${j.company} ${j.description}`.toLowerCase().includes(query)) &&
          (!location || j.location.toLowerCase().includes(location))
      );
      return ok({ jobs, total: jobs.length, page: 1, limit: 20, cached: true });
    }

    case "insights": {
      const result = handleInsights({ method, parts, url, body, state, jobs: JOBS, saveState });
      if (result) return result;
      break;
    }
    case "ats":
      checkFeature(state, "ai", "AI tools are paused for now. Please try again later.");
      return handleAts({ method, parts, url, body, state, jobs: JOBS, saveState });

    case "resumes": {
      if (["tailor", "build", "enhance"].includes(id)) {
        checkFeature(state, "ai", "AI tools are paused for now. Please try again later.");
      }
      if (id === "tailor") return ok(handleTailor({ method, parts, url, body, state, jobs: JOBS, saveState }));
      if (id === "build" || id === "enhance") {
        return ok({ resume: { title: `Resume for ${body.targetRole || "Personal support worker"}`, content: sampleResumeContent() } });
      }
      if (!id) {
        if (method === "GET") return ok({ resumes: state.resumes });
        const resume = { ...body, _id: body._id || `demo-resume-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        state.resumes.unshift(resume);
        saveState();
        return ok({ resume });
      }
      const index = state.resumes.findIndex((r) => r._id === id);
      if (index < 0) throw demoError(404, "Resume not found.");
      if (method === "DELETE") {
        state.resumes.splice(index, 1);
        saveState();
        return ok({ message: "Resume deleted successfully." });
      }
      if (method === "GET") return ok({ resume: state.resumes[index] });
      state.resumes[index] = { ...state.resumes[index], ...body, updatedAt: new Date().toISOString() };
      saveState();
      return ok({ resume: state.resumes[index] });
    }

    case "chat":
      checkFeature(state, "ai", "AI tools are paused for now. Please try again later.");
      return ok({ reply: "Demo mode: the assistant is offline. This is a sample reply." });

    // Account emails: pretend our server sent them, so demo never calls Firebase.
    case "auth":
      if (id === "password-reset") {
        if (!EMAIL_PATTERN.test(String(body?.email || "").trim())) throw demoError(400, "Enter a valid email address.");
        return ok({ message: "If an account uses that email, we sent a link to reset the password.", delivered: true, fallback: null });
      }
      if (id === "send-verification") {
        return ok({ message: "Your email is already verified.", alreadyVerified: true });
      }
      if (id === "email-verified") return ok({ verified: true });
      break;

    default:
      break;
  }

  // Any other write just succeeds; any other read returns an empty success.
  return ok({ message: "Demo mode: no backend call made." });
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mock for the /auth/action page (Firebase applyActionCode, checkActionCode
 * and the password reset calls). Use oobCode "expired" to see the error state.
 */
export async function demoActionCode(mode, oobCode) {
  await delay();

  if (oobCode === "expired") {
    throw Object.assign(new Error("Demo mode: expired link."), { code: "auth/expired-action-code" });
  }

  return { mode, email: DEMO_USER.email };
}

/** Mock for uploadFile. Never sends the file anywhere. */
export async function demoUpload(endpoint, file, options = {}) {
  if (endpoint.startsWith("/api/resumes/extract-text")) {
    await delay();
    const c = sampleResumeContent();
    return ok({
      fileName: file?.name || "resume.pdf",
      resumeText: [c.name, c.title, c.location, c.summary, ...c.skills, ...c.experience.map((e) => `${e.position}, ${e.company}`)].join("\n"),
    });
  }
  if (endpoint.startsWith("/api/resumes/enhance")) {
    const fields = options.fields || {};
    return demoRequest("/api/resumes/enhance", { method: "POST", body: { targetRole: fields.targetRole } });
  }
  await delay();
  return ok({
    message: "Demo mode: file kept on this device only.",
    file: {
      name: file?.name || "file",
      fileUrl: "",
      format: (file?.name || "").split(".").pop() || "",
      mimeType: file?.type || "",
      size: file?.size || 0,
    },
  });
}
