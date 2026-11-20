/*
 * Demo version of the tailor resume endpoints:
 *   POST /api/resumes/tailor       -> { original, tailored, changes, addedKeywords, skippedKeywords }
 *   POST /api/resumes/tailor/save  -> { resume }
 * demoApi.js calls handleTailor from its "resumes" case and wraps the result with ok().
 * Like the real server, only words already in the resume are added. Others are skipped.
 */

const SKIPPED_REASON = "Not found in your resume. Add it yourself only if you really have this skill.";

// Words a care job ad often asks for. Only the ones in the ad are looked at.
const AD_KEYWORDS = [
  "dementia care",
  "palliative care",
  "personal care",
  "mobility support",
  "infection control",
  "meal preparation",
  "medication reminders",
  "first aid",
  "cpr",
  "documentation",
  "long-term care",
  "home care",
  "g license",
  "hoyer lift",
];

const clone = (value) => JSON.parse(JSON.stringify(value));

function demoError(status, message) {
  const error = new Error(message);
  error.status = status;
  error.data = { success: false, message };
  return error;
}

const lower = (value) => String(value || "").toLowerCase();

function resumeText(content) {
  return lower([
    content.summary,
    ...(content.skills || []),
    ...(content.experience || []).flatMap((item) => [item.position, item.company, ...(item.bullets || [])]),
    ...(content.certifications || []).map((item) => item.name),
  ].join(" "));
}

function tailoredTitle(source, jobTitle) {
  return `${source.title || "Resume"}, tailored for ${jobTitle}`;
}

function tailor({ body, state }) {
  const jobDescription = String(body.jobDescription || "").trim();
  if (!jobDescription) throw demoError(400, "Paste the job ad or pick a saved job.");
  const original = state.resumes.find((item) => item._id === body.resumeId);
  if (!original) throw demoError(404, "Resume not found.");

  const content = clone(original.content || {});
  const have = resumeText(content);
  const ad = lower(jobDescription);
  const wanted = AD_KEYWORDS.filter((word) => ad.includes(word));
  const addedKeywords = wanted.filter((word) => have.includes(word));
  const skippedKeywords = wanted
    .filter((word) => !have.includes(word))
    .map((keyword) => ({ keyword, reason: SKIPPED_REASON }));

  const jobTitle = String(body.jobTitle || original.targetRole || "this role").trim();
  const company = String(body.company || "").trim();
  const changes = [];

  const summary = `${content.summary || ""} Ready to bring this care to the ${jobTitle.toLowerCase()} role${company ? ` at ${company}` : ""}.`.trim();
  changes.push({ path: "summary", before: content.summary || "", after: summary, reason: "Names the role you are applying for." });
  content.summary = summary;

  const first = content.experience?.[0];
  if (first?.bullets?.[0]) {
    const before = first.bullets[0];
    const after = `${before.replace(/\.$/, "")}, with clear notes for each shift.`;
    first.bullets[0] = after;
    changes.push({ path: "experience.0.bullets.0", before, after, reason: "Shows the documentation the ad asks for, using work you already describe." });
  }

  if (addedKeywords.length && Array.isArray(content.skills)) {
    // Move skills the ad asks for to the front. Nothing new is added.
    const before = content.skills.join(", ");
    const front = content.skills.filter((skill) => addedKeywords.some((word) => lower(skill).includes(word)));
    content.skills = [...front, ...content.skills.filter((skill) => !front.includes(skill))];
    const after = content.skills.join(", ");
    if (after !== before) changes.push({ path: "skills", before, after, reason: "Skills the ad mentions are listed first." });
  }

  return {
    original: clone(original),
    tailored: { title: tailoredTitle(original, jobTitle), targetRole: jobTitle, content },
    changes,
    addedKeywords,
    skippedKeywords,
  };
}

function save({ body, state, saveState }) {
  const source = state.resumes.find((item) => item._id === body.sourceResumeId);
  if (!source) throw demoError(404, "Resume not found.");
  const jobTitle = String(body.jobTitle || "").trim();
  if (!jobTitle) throw demoError(400, "Add the job title before saving.");
  const now = new Date().toISOString();
  const resume = {
    _id: `demo-resume-${Date.now()}`,
    title: tailoredTitle(source, jobTitle),
    targetRole: body.tailored?.targetRole || jobTitle,
    content: clone(body.tailored?.content || source.content || {}),
    version: (source.version || 1) + 1,
    sourceResumeId: source._id,
    tailoredFor: { jobTitle, company: body.company || "", jobId: body.jobId || "" },
    status: "completed",
    createdAt: now,
    updatedAt: now,
  };
  state.resumes.unshift(resume);
  saveState();
  return { resume };
}

/**
 * Handles /api/resumes/tailor and /api/resumes/tailor/save in demo mode.
 * Returns the payload (without success), or throws an Error with .status.
 */
// eslint-disable-next-line no-unused-vars
export function handleTailor({ method, parts, url, body = {}, state, jobs = [], saveState = () => {} }) {
  if (method !== "POST") throw demoError(405, "Use POST for this request.");
  const sub = parts?.[3];
  if (sub === "save") return save({ body, state, saveState });
  if (!sub) {
    // A saved job fills in the ad text when none was pasted.
    const job = body.jobId ? jobs.find((item) => item._id === body.jobId) : null;
    const filled = job && !String(body.jobDescription || "").trim()
      ? { ...body, jobDescription: job.description, jobTitle: body.jobTitle || job.title, company: body.company || job.company }
      : body;
    return tailor({ body: filled, state });
  }
  throw demoError(404, "Not found.");
}
