/**
 * The ATS score, worked out by code so it is the same every time and every
 * point can be explained. AI only adds advice on top (see service.ts).
 */
import { extractJobKeywords, matchKeywords, stem, type KeywordMatch } from "./keywords";

export type CheckStatus = "pass" | "warn" | "fail";

export type ScoreCheck = {
  id: CheckId;
  label: string;
  weight: number;
  points: number;
  status: CheckStatus;
  detail: string;
  fixes: string[];
};

export const WEIGHTS = {
  keywords: 35,
  sections: 15,
  bullets: 15,
  contact: 10,
  dates: 10,
  length: 10,
  readability: 5,
} as const;

export type CheckId = keyof typeof WEIGHTS;

type SectionId = "summary" | "experience" | "education" | "skills";

/** What the score needs to know about a resume. */
export type ResumeFacts = {
  /** All the resume's words, used for keywords and length. */
  text: string;
  sections: Record<SectionId, boolean>;
  contact: { email: boolean; phone: boolean; location: boolean; linkedin: boolean };
  bullets: string[];
  /** Raw date strings, such as "Jan 2024" or "2021-03". */
  dates: string[];
};

/* ---------- Facts from pasted text ---------- */

const EMAIL = /[\w.+-]+@[\w-]+(\.[\w-]+)+/;
const PHONE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const PROVINCES =
  /\b(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT|Alberta|British Columbia|Manitoba|New Brunswick|Newfoundland|Nova Scotia|Ontario|Prince Edward Island|Quebec|Saskatchewan|Yukon)\b/;
const POSTAL_CODE = /\b[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d\b/;
const LINKEDIN = /linkedin\.com\/\S+/i;

const HEADINGS: Record<SectionId, RegExp> = {
  summary: /^\s*(professional |career )?(summary|profile|objective|about me)\s*:?\s*$/im,
  experience: /^\s*((work|professional|relevant|employment) )?(experience|history|employment)( history)?\s*:?\s*$/im,
  education: /^\s*(education|education and training|training|academic background)\s*:?\s*$/im,
  skills: /^\s*((key|core|technical) )?(skills|competencies|qualifications|skills and abilities)\s*:?\s*$/im,
};

const BULLET_LINE = /^\s*(?:[-*•▪●‣◦–]|\d+[.)])\s+(.+)$/;

const MONTHS =
  "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATE_PATTERN = new RegExp(
  `\\b${MONTHS}\\s+(?:19|20)\\d{2}\\b|\\b(?:0?[1-9]|1[0-2])/(?:19|20)\\d{2}\\b|\\b(?:19|20)\\d{2}-(?:0[1-9]|1[0-2])\\b|\\b(?:19|20)\\d{2}\\b`,
  "gi"
);

/** Facts from pasted or uploaded resume text, found with heading regexes. */
export function factsFromText(text: string): ResumeFacts {
  const withoutContact = text
    .replace(new RegExp(EMAIL.source, "g"), " ")
    .replace(new RegExp(PHONE.source, "g"), " ")
    .replace(/https?:\/\/\S+/g, " ");

  return {
    text,
    sections: {
      summary: HEADINGS.summary.test(text),
      experience: HEADINGS.experience.test(text),
      education: HEADINGS.education.test(text),
      skills: HEADINGS.skills.test(text),
    },
    contact: {
      email: EMAIL.test(text),
      phone: PHONE.test(text),
      location: PROVINCES.test(text) || POSTAL_CODE.test(text),
      linkedin: LINKEDIN.test(text),
    },
    bullets: text
      .split(/\r?\n/)
      .map((line) => BULLET_LINE.exec(line)?.[1]?.trim() ?? "")
      .filter(Boolean),
    dates: withoutContact.match(DATE_PATTERN) ?? [],
  };
}

/* ---------- Facts from a saved resume ---------- */

type Maybe = string | null | undefined;

/** The shape of a saved resume's content (all optional, as stored). */
export type ResumeContentLike = {
  email?: Maybe;
  phone?: Maybe;
  location?: Maybe;
  linkedin?: Maybe;
  summary?: Maybe;
  experience?: ReadonlyArray<{ startDate?: Maybe; endDate?: Maybe; bullets?: ReadonlyArray<string> | null }> | null;
  education?: ReadonlyArray<{ startDate?: Maybe; endDate?: Maybe }> | null;
  skills?: ReadonlyArray<string> | null;
  projects?: ReadonlyArray<{ bullets?: ReadonlyArray<string> | null }> | null;
};

const filled = (value: Maybe) => typeof value === "string" && value.trim().length > 0;

/** Facts from a saved resume's fields. `text` is the resume as plain text. */
export function factsFromContent(content: ResumeContentLike, text: string): ResumeFacts {
  const experience = content.experience ?? [];
  const education = content.education ?? [];
  const dates = [...experience, ...education]
    .flatMap((entry) => [entry.startDate, entry.endDate])
    .filter((value): value is string => filled(value))
    .flatMap((value) => value.match(DATE_PATTERN) ?? []);

  return {
    text,
    sections: {
      summary: filled(content.summary),
      experience: experience.length > 0,
      education: education.length > 0,
      skills: (content.skills ?? []).some((skill) => filled(skill)),
    },
    contact: {
      email: filled(content.email),
      phone: filled(content.phone),
      location: filled(content.location),
      linkedin: filled(content.linkedin),
    },
    bullets: [
      ...experience.flatMap((job) => job.bullets ?? []),
      ...(content.projects ?? []).flatMap((project) => project.bullets ?? []),
    ].filter((bullet) => filled(bullet)),
    dates,
  };
}

/* ---------- Checks ---------- */

function statusFor(points: number, weight: number, passAt = 0.8, warnAt = 0.5): CheckStatus {
  const share = weight ? points / weight : 0;
  if (share >= passAt) return "pass";
  if (share >= warnAt) return "warn";
  return "fail";
}

const round1 = (value: number) => Math.round(value * 10) / 10;

function keywordCheck(match: KeywordMatch, keywordCount: number): ScoreCheck {
  const weight = WEIGHTS.keywords;
  if (!keywordCount) {
    return {
      id: "keywords",
      label: "Job keywords",
      weight,
      points: 0,
      status: "warn",
      detail: "We could not find clear keywords in this job posting. Paste the full posting to check them.",
      fixes: ["Paste the whole job posting, including duties and requirements."],
    };
  }

  const points = round1(weight * match.coverage);
  const fixes: string[] = [];
  if (match.missing.length) {
    fixes.push(`Add these words where they are true for you: ${match.missing.slice(0, 5).join(", ")}.`);
    fixes.push("Use the same words as the posting. Many systems do not match close wording.");
  }

  return {
    id: "keywords",
    label: "Job keywords",
    weight,
    points,
    status: statusFor(points, weight, 0.7, 0.4),
    detail: `Your resume shows ${match.matched.length} of ${keywordCount} key words from the job posting.`,
    fixes,
  };
}

const SECTION_POINTS: Record<SectionId, number> = { experience: 4, education: 4, skills: 4, summary: 3 };
const SECTION_NAMES: Record<SectionId, string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
};

function sectionCheck(facts: ResumeFacts): ScoreCheck {
  const ids = Object.keys(SECTION_POINTS) as SectionId[];
  const missing = ids.filter((id) => !facts.sections[id]);
  const points = ids.reduce((sum, id) => sum + (facts.sections[id] ? SECTION_POINTS[id] : 0), 0);

  return {
    id: "sections",
    label: "Standard sections",
    weight: WEIGHTS.sections,
    points,
    status: missing.length === 0 ? "pass" : missing.length === 1 ? "warn" : "fail",
    detail: missing.length
      ? `Missing: ${missing.map((id) => SECTION_NAMES[id]).join(", ")}.`
      : "Summary, experience, education and skills are all there.",
    fixes: missing.map((id) => `Add a ${SECTION_NAMES[id]} section with a plain heading.`),
  };
}

const ACTION_VERBS = new Set(
  [
    "achieve", "administer", "advise", "analyze", "analyse", "assist", "assess", "build", "care",
    "clean", "coach", "collaborate", "communicate", "complete", "coordinate", "create", "deliver",
    "design", "develop", "document", "drive", "educate", "establish", "evaluate", "feed", "help",
    "handle", "implement", "improve", "increase", "launch", "lead", "led", "maintain", "manage",
    "mentor", "monitor", "negotiate", "operate", "organize", "organise", "oversee", "plan",
    "prepare", "process", "provide", "reduce", "report", "research", "resolve", "run", "save",
    "schedule", "serve", "set", "ship", "solve", "streamline", "supervise", "support", "teach",
    "test", "train", "transfer", "write", "wrote", "built", "ran", "drove", "taught", "grew",
    "won", "cut", "sold", "make", "made",
  ].map(stem)
);

const METRIC = /\d|%|\$/;

function firstWord(bullet: string): string {
  return (bullet.trim().split(/\s+/)[0] ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

const startsWithVerb = (bullet: string) => {
  const word = firstWord(bullet);
  return ACTION_VERBS.has(stem(word)) || (word.length > 4 && word.endsWith("ed"));
};

function bulletCheck(facts: ResumeFacts): ScoreCheck {
  const weight = WEIGHTS.bullets;
  const { bullets } = facts;

  if (!bullets.length) {
    return {
      id: "bullets",
      label: "Bullet points",
      weight,
      points: 0,
      status: "fail",
      detail: "No bullet points found under your jobs.",
      fixes: ["List what you did in each job as short bullet points."],
    };
  }

  const verbShare = bullets.filter(startsWithVerb).length / bullets.length;
  const metricShare = bullets.filter((bullet) => METRIC.test(bullet)).length / bullets.length;
  const points = round1(
    5 * Math.min(1, bullets.length / 3) + 5 * Math.min(1, verbShare / 0.8) + 5 * Math.min(1, metricShare / 0.4)
  );

  const fixes: string[] = [];
  if (bullets.length < 3) fixes.push("Add at least three bullet points for your recent jobs.");
  if (verbShare < 0.8) fixes.push("Start each bullet with an action word, such as \"Supported\" or \"Managed\".");
  if (metricShare < 0.4) fixes.push("Add numbers where you can, such as how many clients, hours or dollars.");

  return {
    id: "bullets",
    label: "Bullet points",
    weight,
    points,
    status: statusFor(points, weight),
    detail: `${bullets.length} bullets: ${Math.round(verbShare * 100)}% start with an action word and ${Math.round(metricShare * 100)}% include a number.`,
    fixes,
  };
}

const CONTACT_POINTS = { email: 4, phone: 3, location: 2, linkedin: 1 } as const;
const CONTACT_FIXES: Record<keyof typeof CONTACT_POINTS, string> = {
  email: "Add your email address at the top.",
  phone: "Add a phone number at the top.",
  location: "Add your city and province, such as Brampton, ON.",
  linkedin: "Add your LinkedIn profile link.",
};

function contactCheck(facts: ResumeFacts): ScoreCheck {
  const ids = Object.keys(CONTACT_POINTS) as (keyof typeof CONTACT_POINTS)[];
  const missing = ids.filter((id) => !facts.contact[id]);
  const points = ids.reduce((sum, id) => sum + (facts.contact[id] ? CONTACT_POINTS[id] : 0), 0);

  return {
    id: "contact",
    label: "Contact details",
    weight: WEIGHTS.contact,
    points,
    status: statusFor(points, WEIGHTS.contact, 0.9, 0.6),
    detail: missing.length
      ? `Missing: ${missing.join(", ").replace("linkedin", "LinkedIn")}.`
      : "Email, phone, location and LinkedIn are all there.",
    fixes: missing.map((id) => CONTACT_FIXES[id]),
  };
}

/** The style a date is written in, so mixed styles can be spotted. */
export function dateFormat(value: string): string {
  if (/^\d{1,2}\/\d{4}$/.test(value)) return "MM/YYYY";
  if (/^\d{4}-\d{2}$/.test(value)) return "YYYY-MM";
  if (/^\d{4}$/.test(value)) return "YYYY";
  return "Mon YYYY";
}

function dateCheck(facts: ResumeFacts): ScoreCheck {
  const weight = WEIGHTS.dates;
  if (!facts.dates.length) {
    return {
      id: "dates",
      label: "Dates",
      weight,
      points: 0,
      status: "fail",
      detail: "No start or end dates found.",
      fixes: ["Add a start and end date to each job, such as Jan 2023 to Present."],
    };
  }

  // A year on its own (often for school) sits fine next to any one other style.
  const all = [...new Set(facts.dates.map(dateFormat))];
  const formats = all.length > 1 ? all.filter((format) => format !== "YYYY") : all;
  if (formats.length === 1) {
    return {
      id: "dates",
      label: "Dates",
      weight,
      points: weight,
      status: "pass",
      detail: `All dates use one style (${formats[0]}).`,
      fixes: [],
    };
  }

  return {
    id: "dates",
    label: "Dates",
    weight,
    points: weight / 2,
    status: "warn",
    detail: `Your dates mix ${formats.length} styles: ${formats.join(", ")}.`,
    fixes: ["Write every date the same way, such as Jan 2023."],
  };
}

export const wordCount = (text: string) => (text.match(/[A-Za-z0-9][\w'+#.-]*/g) ?? []).length;

/** Length bands in words: about one to two pages is right for most Canadian resumes. */
export function lengthBand(words: number): { points: number; status: CheckStatus; detail: string; fix?: string } {
  if (words < 150) {
    return { points: 2, status: "fail", detail: `${words} words. This is too short to show your experience.`, fix: "Add more detail about your jobs, skills and training." };
  }
  if (words < 300) {
    return { points: 6, status: "warn", detail: `${words} words. This is a little short.`, fix: "Add a bullet or two about results in each recent job." };
  }
  if (words <= 900) {
    return { points: 10, status: "pass", detail: `${words} words. A good length for one to two pages.` };
  }
  if (words <= 1200) {
    return { points: 6, status: "warn", detail: `${words} words. This is a little long.`, fix: "Cut older or less related jobs down to one or two lines." };
  }
  return { points: 3, status: "fail", detail: `${words} words. This is too long for most employers.`, fix: "Keep it to two pages. Cut older jobs and repeated points." };
}

function lengthCheck(facts: ResumeFacts): ScoreCheck {
  const band = lengthBand(wordCount(facts.text));
  return {
    id: "length",
    label: "Length",
    weight: WEIGHTS.length,
    points: band.points,
    status: band.status,
    detail: band.detail,
    fixes: band.fix ? [band.fix] : [],
  };
}

const PRONOUN = /\b(I|me|my|myself)\b/;

function readabilityCheck(facts: ResumeFacts): ScoreCheck {
  const lines = facts.bullets.length
    ? facts.bullets
    : facts.text.split(/(?<=[.!?])\s+|\r?\n/).filter((line) => line.trim());
  const lengths = lines.map(wordCount).filter((n) => n > 0);
  const average = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
  const longOnes = lengths.filter((n) => n > 35).length;
  const usesPronouns = facts.bullets.some((bullet) => PRONOUN.test(bullet));

  const fixes: string[] = [];
  if (average > 25) fixes.push("Keep bullets short, about one line each.");
  if (longOnes) fixes.push(`Split the ${longOnes} very long ${longOnes === 1 ? "line" : "lines"} into shorter ones.`);
  if (usesPronouns) fixes.push("Leave out \"I\" and \"my\". Start with the action instead.");

  const points = fixes.length === 0 ? 5 : fixes.length === 1 ? 3 : 1;
  return {
    id: "readability",
    label: "Easy to read",
    weight: WEIGHTS.readability,
    points,
    status: fixes.length === 0 ? "pass" : fixes.length === 1 ? "warn" : "fail",
    detail: fixes.length
      ? `Lines average ${Math.round(average)} words.`
      : `Short, clear lines that average ${Math.round(average)} words.`,
    fixes,
  };
}

/** Every check for one resume against one job, in weight order. */
export function scoreResume(
  facts: ResumeFacts,
  jobDescription: string,
  match: KeywordMatch = matchJob(facts, jobDescription)
): ScoreCheck[] {
  const keywordCount = match.matched.length + match.missing.length;
  return [
    keywordCheck(match, keywordCount),
    sectionCheck(facts),
    bulletCheck(facts),
    contactCheck(facts),
    dateCheck(facts),
    lengthCheck(facts),
    readabilityCheck(facts),
  ];
}

/** The job keywords the resume shows and lacks. */
export function matchJob(facts: ResumeFacts, jobDescription: string, employer?: string): KeywordMatch {
  return matchKeywords(facts.text, extractJobKeywords(jobDescription, undefined, employer));
}

/** The 0 to 100 score: the sum of every check's points. */
export function totalScore(checks: ScoreCheck[]): number {
  const sum = checks.reduce((total, check) => total + check.points, 0);
  return Math.min(100, Math.max(0, Math.round(sum)));
}
