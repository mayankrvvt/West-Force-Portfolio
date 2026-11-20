import { withAiRetry } from "../../lib/aiRetry";
import { gemini } from "../../lib/clients/gemini";
import { config } from "../../lib/config";
import { AppError } from "../../lib/errors";
import { toText } from "../../lib/text";
import User from "../users/model";
import { BAD_AI_RESUME_MESSAGE, parseGeminiJson } from "./ai.service";
import Resume, { type ResumeAttrs, type ResumeDocument } from "./model";
import { isJsonObject } from "./normalize";
import { getResume } from "./service";
import { tailorResumePrompt } from "./tailor.prompt";
import { aiTailor, type AiTailor, type TailorBody, type TailorSaveBody } from "./tailor.schema";

type Json = Record<string, unknown>;

export type TailoredContent = Json & {
  summary: string;
  experience: (Json & { bullets: string[] })[];
  skills: string[];
};

export type TailorChange = { path: string; before: string; after: string; reason: string };
export type SkippedKeyword = { keyword: string; reason: string };

export const SKIPPED_NOT_IN_RESUME =
  "Not found in your resume. Add it yourself only if you really have this skill.";

/* ---------- text helpers ---------- */

const asObject = (value: unknown): Json => (isJsonObject(value) ? value : {});
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const textList = (value: unknown): string[] =>
  asArray(value)
    .map((item) => toText(item).trim())
    .filter(Boolean);

/** Lower case, punctuation to spaces, so "Node.js" and "node js" match. */
export function normalizeText(value: string): string {
  return ` ${value.toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim()} `;
}

/** Every string inside a value, joined. */
function allText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(allText).join(" ");
  if (isJsonObject(value)) return Object.values(value).map(allText).join(" ");
  return "";
}

const mentions = (haystack: string, keyword: string) => {
  const needle = normalizeText(keyword);
  return needle.trim() !== "" && haystack.includes(needle);
};

const sameWord = (a: string, b: string) => normalizeText(a) === normalizeText(b);

/** Plain JSON copy of a resume's content (a Mongoose subdocument or a plain object). */
export function plainContent(value: unknown): Json {
  const source = value as { toObject?: () => unknown } | null | undefined;
  const plain = typeof source?.toObject === "function" ? source.toObject() : value;
  return JSON.parse(JSON.stringify(asObject(plain))) as Json;
}

/* ---------- honesty guard ---------- */

/** Numbers in text, so "$5,000", "5000" and "5,000." all read as "5000". */
const numbersIn = (text: string): string[] =>
  (text.match(/\d[\d,.]*/g) ?? []).map((n) => n.replace(/[.,]+$/, "").replace(/,/g, ""));

/**
 * Names in text: a word with a capital letter, except a plain capitalised word
 * that starts a sentence ("Helped", "Supported").
 */
function namesIn(text: string): string[] {
  const names: string[] = [];
  let sentenceStart = true;
  for (const token of text.split(/\s+/)) {
    const word = token.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9+#]+$/g, "");
    if (word && /[A-Z]/.test(word) && !(sentenceStart && /^[A-Z][a-z]*$/.test(word))) names.push(word);
    if (word) sentenceStart = /[.!?:;]$/.test(token);
  }
  return names;
}

/** True when every number and name in the text already appears in the original resume. */
function factsSupported(text: string, original: Json): boolean {
  const source = allText(original);
  const sourceNumbers = new Set(numbersIn(source));
  const sourceText = normalizeText(source);
  return (
    numbersIn(text).every((n) => sourceNumbers.has(n)) &&
    namesIn(text).every((name) => mentions(sourceText, name))
  );
}

/** Same job: company and position match (ignoring case and punctuation). */
function sameEntry(entry: Json, candidateValue: unknown): boolean {
  const candidate = asObject(candidateValue);
  return (
    sameWord(toText(entry.company), toText(candidate.company)) &&
    sameWord(toText(entry.position), toText(candidate.position))
  );
}

/**
 * Builds the tailored content from the original and a candidate. Company,
 * position, dates, location, education, projects, certificates, contact
 * details and the number of entries always come from the original. Only the
 * summary, the text of existing bullets and the skill list can change, and a
 * new skill (or a keyword the AI says it added) must already appear in the
 * original's text; otherwise it is skipped and any rewritten text that brings
 * it in is put back.
 */
export function guardTailored(
  originalValue: unknown,
  candidateValue: unknown,
  claimedKeywords: string[] = []
): { content: TailoredContent; addedKeywords: string[]; skippedKeywords: SkippedKeyword[] } {
  const original = plainContent(originalValue);
  const candidate = asObject(candidateValue);
  const sourceText = normalizeText(allText(original));
  const originalSkills = textList(original.skills);

  const addedKeywords: string[] = [];
  const skippedKeywords: SkippedKeyword[] = [];
  const unsupported: string[] = [];

  const consider = (keyword: string) => {
    if ([...addedKeywords, ...unsupported].some((seen) => sameWord(seen, keyword))) return;
    if (mentions(sourceText, keyword)) {
      addedKeywords.push(keyword);
    } else {
      unsupported.push(keyword);
      skippedKeywords.push({ keyword, reason: SKIPPED_NOT_IN_RESUME });
    }
  };

  // Skills: keep every original skill, add new ones only when supported.
  const skills = [...originalSkills];
  for (const skill of textList(candidate.skills)) {
    if (skills.some((existing) => sameWord(existing, skill))) continue;
    consider(skill);
    if (addedKeywords.some((added) => sameWord(added, skill))) skills.push(skill);
  }
  for (const keyword of claimedKeywords) {
    if (!originalSkills.some((existing) => sameWord(existing, keyword))) consider(keyword);
  }

  // Rewritten text that brings in an unsupported keyword, or a number or name
  // the resume never shows, goes back to the original.
  const keep = (before: string, after: unknown): string => {
    const next = toText(after).trim();
    if (!next) return before;
    const brought = unsupported.some(
      (keyword) => mentions(normalizeText(next), keyword) && !mentions(normalizeText(before), keyword)
    );
    return brought || !factsSupported(next, original) ? before : next;
  };

  const candidateExperience = asArray(candidate.experience);
  const experience = asArray(original.experience).map((entryValue, index) => {
    const entry = asObject(entryValue);
    const before = textList(entry.bullets);
    const match = sameEntry(entry, candidateExperience[index]) ? candidateExperience[index] : entry;
    const proposed = asArray(asObject(match).bullets);

    return { ...entry, bullets: before.map((bullet, i) => keep(bullet, proposed[i])) };
  });

  const originalSummary = toText(original.summary);

  return {
    content: {
      ...original,
      summary: keep(originalSummary, candidate.summary),
      experience,
      skills,
    },
    addedKeywords,
    skippedKeywords,
  };
}

/** The AI reply turned into a full candidate content (still unguarded). */
function candidateFromAi(original: Json, reply: AiTailor): Json {
  const candidate = JSON.parse(JSON.stringify(original)) as Json;
  const raw = reply as Json;

  // Some replies send whole experience entries. Use one only when it is still
  // the same job at the same index; a reordered or missing entry keeps the original.
  if (Array.isArray(raw.experience)) {
    const sent = raw.experience as unknown[];
    candidate.experience = asArray(original.experience).map((entry, i) =>
      sameEntry(asObject(entry), sent[i]) ? sent[i] : entry
    );
  }

  const experience = asArray(candidate.experience).map((entry) => {
    const copy = { ...asObject(entry) };
    copy.bullets = [...asArray(copy.bullets)];
    return copy;
  });

  for (const edit of reply.bullets ?? []) {
    const bullets = experience[edit.experienceIndex]?.bullets;
    if (Array.isArray(bullets) && edit.bulletIndex < bullets.length) {
      bullets[edit.bulletIndex] = edit.text;
    }
  }

  candidate.experience = experience;
  if (typeof reply.summary === "string" && reply.summary.trim()) candidate.summary = reply.summary;
  if (reply.skills?.length) candidate.skills = reply.skills.map((skill) => toText(skill));

  return candidate;
}

/** A list of what changed, path by path, for the diff view. */
export function listChanges(
  originalValue: unknown,
  tailored: TailoredContent,
  reply?: AiTailor
): TailorChange[] {
  const original = plainContent(originalValue);
  const changes: TailorChange[] = [];
  const reasonText = (value: unknown, fallback: string) => toText(value).trim() || fallback;

  const summaryBefore = toText(original.summary);
  if (summaryBefore !== tailored.summary) {
    changes.push({
      path: "summary",
      before: summaryBefore,
      after: tailored.summary,
      reason: reasonText(reply?.reasons?.summary, "Matches the wording of the job ad."),
    });
  }

  asArray(original.experience).forEach((entryValue, e) => {
    const before = textList(asObject(entryValue).bullets);
    before.forEach((bullet, b) => {
      const after = tailored.experience[e]?.bullets[b] ?? bullet;
      if (after === bullet) return;
      const edit = reply?.bullets?.find((x) => x.experienceIndex === e && x.bulletIndex === b);
      changes.push({
        path: `experience.${e}.bullets.${b}`,
        before: bullet,
        after,
        reason: reasonText(edit?.reason, "Uses the job ad's words for the same work."),
      });
    });
  });

  const skillsBefore = textList(original.skills).join(", ");
  const skillsAfter = tailored.skills.join(", ");
  if (skillsBefore !== skillsAfter) {
    changes.push({
      path: "skills",
      before: skillsBefore,
      after: skillsAfter,
      reason: reasonText(reply?.reasons?.skills, "Skills the job ad asks for, found in your resume."),
    });
  }

  return changes;
}

/* ---------- AI call ---------- */

const badAiTailor = (cause: unknown) =>
  new AppError(502, BAD_AI_RESUME_MESSAGE, { code: "AI_BAD_RESPONSE", cause });

/** Gemini's tailor reply, checked before use. Bad JSON or a bad shape is a 502. */
export function readAiTailor(text: string | undefined): AiTailor {
  let parsed: unknown;

  try {
    parsed = parseGeminiJson(text);
  } catch (error) {
    throw badAiTailor(error);
  }

  if (!isJsonObject(parsed)) throw badAiTailor(new Error("Gemini reply is not an object."));

  const checked = aiTailor.safeParse(parsed);
  if (!checked.success) throw badAiTailor(checked.error);

  return checked.data;
}

/** POST /api/resumes/tailor: the original, the guarded tailored copy and the change list. */
export async function tailorResume(firebaseUid: string, body: TailorBody) {
  const source = await getResume(firebaseUid, body.resumeId);

  if (!gemini) throw new Error("GEMINI_API_KEY is not configured on the server.");
  const client = gemini;

  const original = plainContent(source.content);
  const jobTitle = body.jobTitle || source.targetRole || "";

  const response = await withAiRetry(() =>
    client.models.generateContent({
      model: config.GEMINI_RESUME_MODEL,
      contents: tailorResumePrompt({
        content: original,
        jobDescription: body.jobDescription,
        jobTitle: body.jobTitle,
        company: body.company,
      }),
      config: { temperature: 0.2, responseMimeType: "application/json" },
    })
  );

  const reply = readAiTailor(response.text);
  const guarded = guardTailored(
    original,
    candidateFromAi(original, reply),
    textList(reply.addedKeywords)
  );

  return {
    original: source,
    tailored: {
      title: tailoredTitle(source.title, jobTitle),
      targetRole: jobTitle,
      content: guarded.content,
    },
    changes: listChanges(original, guarded.content, reply),
    addedKeywords: guarded.addedKeywords,
    skippedKeywords: guarded.skippedKeywords,
  };
}

export function tailoredTitle(sourceTitle: string | null | undefined, jobTitle: string): string {
  const base = toText(sourceTitle).trim() || "Resume";
  return jobTitle ? `${base}, tailored for ${jobTitle}` : base;
}

/**
 * POST /api/resumes/tailor/save: a new resume made from the source. The
 * client's copy is guarded again against the source, and the source is never
 * changed.
 */
export async function saveTailoredResume(
  firebaseUid: string,
  body: TailorSaveBody
): Promise<ResumeDocument> {
  const source = await getResume(firebaseUid, body.sourceResumeId);
  const sent = body.tailored;
  const candidate = isJsonObject(sent.content) ? sent.content : sent;
  const { content } = guardTailored(source.content, candidate);
  const user = await User.findOne({ firebaseUid }).select("_id");

  return Resume.create({
    userId: firebaseUid,
    ownerId: source.ownerId ?? user?._id,
    title: tailoredTitle(source.title, body.jobTitle),
    fileName: source.fileName,
    version: (source.version ?? 1) + 1,
    status: "completed",
    template: source.template,
    targetRole: body.jobTitle,
    country: source.country,
    experienceLevel: source.experienceLevel,
    sourceResumeId: source._id,
    tailoredFor: { jobTitle: body.jobTitle, company: body.company, jobId: body.jobId },
    content: content as unknown as ResumeAttrs["content"],
  });
}
