/**
 * Pure text helpers for the ATS score: normalising, stopwords, a light
 * stemmer and job keyword extraction. No I/O and no dependencies, so the
 * same input always gives the same output.
 */

/** Common English words plus job posting filler that says nothing about the job. */
export const STOPWORDS: ReadonlySet<string> = new Set([
  "a", "about", "above", "after", "again", "against", "all", "also", "am", "an", "and", "any",
  "are", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
  "but", "by", "can", "could", "did", "do", "does", "doing", "down", "during", "each", "either",
  "etc", "every", "few", "for", "from", "further", "had", "has", "have", "having", "he", "her",
  "here", "hers", "him", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself",
  "just", "may", "me", "might", "more", "most", "must", "my", "no", "nor", "not", "now", "of",
  "off", "on", "once", "one", "only", "or", "other", "our", "ours", "out", "over", "own", "per",
  "same", "shall", "she", "should", "so", "some", "such", "than", "that", "the", "their",
  "theirs", "them", "then", "there", "these", "they", "this", "those", "through", "to", "too",
  "under", "until", "up", "upon", "us", "very", "via", "was", "we", "were", "what", "when",
  "where", "which", "while", "who", "whom", "why", "will", "with", "within", "would", "you",
  "your", "yours",
  // Job posting filler
  "ability", "able", "apply", "applicant", "applicants", "candidate", "candidates", "company",
  "day", "days", "desired", "ensure", "excellent", "including", "ideal", "ideally", "job",
  "join", "looking", "new", "opportunity", "plus", "position", "preferred", "related",
  "required", "requirement", "requirements", "responsibilities", "role", "seeking", "strong",
  "successful", "team", "well", "work", "working", "year", "years", "week", "weeks", "hour",
  "hours", "time", "full", "part", "please", "based", "good", "great", "using", "use", "need",
  "needs", "experience", "skills", "skill", "knowledge", "proven", "demonstrated",
]);

/** Lowercase, drop punctuation, keep tokens like "c++", "c#" and "node.js". */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/'s\b/g, "")
    .replace(/[^a-z0-9+#.\s]+/g, " ")
    .split(/\s+/)
    .map((token) => token.replace(/^\.+|\.+$/g, ""))
    .filter(Boolean)
    .join(" ");
}

/** Split normalised text into tokens. */
export function tokenize(text: string): string[] {
  const clean = normalise(text);
  return clean ? clean.split(" ") : [];
}

const SUFFIXES = ["ations", "ation", "ments", "ment", "ings", "ing", "ions", "ion", "ies", "ed", "es", "s"];

/**
 * A light suffix stemmer: "managing", "managed", "manages" and "management"
 * all become "manag". Short words and tokens with symbols are left alone.
 */
export function stem(word: string): string {
  if (word.length <= 3 || !/^[a-z]+$/.test(word)) return word;

  let base = word;
  for (const suffix of SUFFIXES) {
    if (!word.endsWith(suffix)) continue;
    if (suffix === "s" && /(ss|us|is)$/.test(word)) break;
    const cut = word.slice(0, -suffix.length);
    if (cut.length < 3) break;
    base = suffix === "ies" ? `${cut}y` : cut;
    // "planning" -> "plann" -> "plan"
    if (["ing", "ings", "ed"].includes(suffix) && /([b-df-hj-np-tv-z])\1$/.test(base) && !/(ll|ss|ff|zz)$/.test(base)) {
      base = base.slice(0, -1);
    }
    break;
  }

  return base.length > 3 && base.endsWith("e") ? base.slice(0, -1) : base;
}

/**
 * Job ad words that are never a skill: Canadian provinces and big cities, and
 * pay, benefit and equal opportunity boilerplate. Only used for job keywords.
 */
export const JOB_AD_NOISE: ReadonlySet<string> = new Set([
  // Provinces, territories and their short forms
  "canada", "canadian", "ontario", "quebec", "québec", "alberta", "manitoba", "saskatchewan",
  "british", "columbia", "nova", "scotia", "brunswick", "newfoundland", "labrador", "yukon",
  "nunavut", "northwest", "territories", "pei", "qc", "bc", "ab", "mb", "sk", "ns", "nb", "nl",
  "yt", "nt", "nu", "gta",
  // Cities
  "toronto", "montreal", "montréal", "vancouver", "calgary", "edmonton", "ottawa", "winnipeg",
  "mississauga", "brampton", "hamilton", "surrey", "laval", "halifax", "markham", "vaughan",
  "gatineau", "saskatoon", "regina", "kitchener", "waterloo", "windsor", "oakville",
  "burlington", "oshawa", "barrie", "guelph", "kelowna", "victoria", "richmond", "burnaby",
  "scarborough", "etobicoke", "london",
  // Pay and benefits
  "benefit", "benefits", "salary", "salaries", "wage", "wages", "pay", "compensation",
  "competitive", "dental", "vacation", "pto", "pension", "rrsp", "bonus", "perks", "paid",
  "hourly", "annually",
  // Equal opportunity and application boilerplate
  "equal", "employer", "employment", "eeo", "diversity", "diverse", "inclusive", "inclusion",
  "accommodation", "accommodations", "applications", "resume", "resumes", "cover", "letter",
  "interview", "contacted", "selected", "thank", "thanks", "hiring",
]);

const isUseful = (token: string) =>
  token.length > 1 && !STOPWORDS.has(token) && !JOB_AD_NOISE.has(token) && !/^[\d.+#]+$/.test(token);

/** The job ad with the employer's name taken out, so it is never a keyword. */
function withoutEmployer(jobDescription: string, employer?: string): string {
  const name = employer?.trim();
  if (!name) return jobDescription;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // A line break keeps the words on each side from forming a pair.
  return jobDescription.replace(new RegExp(`${escaped}(?:['’]s)?`, "gi"), "\n");
}

/** Text split at sentence ends and line breaks, so bigrams never cross them. */
function segments(text: string): string[][] {
  return text
    .split(/[\n\r;:,!?()[\]{}|•]+|\.(?=\s|$)/)
    .map((part) => tokenize(part))
    .filter((tokens) => tokens.length > 0);
}

export type JobKeyword = {
  /** The words as they read in the posting, e.g. "personal support". */
  term: string;
  /** Stems used for matching: one for a single word, two for a pair. */
  stems: string[];
  count: number;
};

type Tally = { stems: string[]; count: number; first: number; forms: Map<string, number> };

function bump(map: Map<string, Tally>, key: string, stems: string[], form: string, position: number) {
  const entry = map.get(key) ?? { stems, count: 0, first: position, forms: new Map<string, number>() };
  entry.count += 1;
  entry.forms.set(form, (entry.forms.get(form) ?? 0) + 1);
  map.set(key, entry);
}

/** The most used spelling of a term, earliest first on a tie. */
function bestForm(forms: Map<string, number>): string {
  let best = "";
  let bestCount = 0;
  for (const [form, count] of forms) {
    if (count > bestCount) {
      best = form;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Keywords from a job description: single words and two word phrases ranked
 * by how often they appear. A pair must appear at least twice. A single word
 * that only ever appears inside a kept pair is dropped as a duplicate. Places,
 * benefit words and the employer's name (when given) are never keywords.
 */
export function extractJobKeywords(jobDescription: string, limit = 25, employer?: string): JobKeyword[] {
  const unigrams = new Map<string, Tally>();
  const bigrams = new Map<string, Tally>();
  let position = 0;

  for (const tokens of segments(withoutEmployer(jobDescription, employer))) {
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i] as string;
      position += 1;
      if (!isUseful(token)) continue;
      const s = stem(token);
      bump(unigrams, s, [s], token, position);

      const next = tokens[i + 1];
      if (next && isUseful(next)) {
        const pair = [s, stem(next)];
        bump(bigrams, pair.join(" "), pair, `${token} ${next}`, position);
      }
    }
  }

  const keptPairs = [...bigrams.values()].filter((entry) => entry.count >= 2);
  const covered = new Map<string, number>();
  for (const pair of keptPairs) {
    for (const s of pair.stems) covered.set(s, (covered.get(s) ?? 0) + pair.count);
  }

  const ranked = [
    ...keptPairs.map((entry) => ({ entry, weight: entry.count * 1.5 })),
    ...[...unigrams.entries()]
      .filter(([s, entry]) => (covered.get(s) ?? 0) < entry.count)
      .map(([, entry]) => ({ entry, weight: entry.count })),
  ];

  ranked.sort((a, b) => b.weight - a.weight || a.entry.first - b.entry.first);

  return ranked.slice(0, limit).map(({ entry }) => ({
    term: bestForm(entry.forms),
    stems: entry.stems,
    count: entry.count,
  }));
}

export type KeywordMatch = { matched: string[]; missing: string[]; coverage: number };

/** Which job keywords the resume shows, compared by stem. Coverage is 0 to 1. */
export function matchKeywords(resumeText: string, keywords: JobKeyword[]): KeywordMatch {
  const singles = new Set<string>();
  const pairs = new Set<string>();

  for (const tokens of segments(resumeText)) {
    const stems = tokens.map(stem);
    stems.forEach((s, i) => {
      singles.add(s);
      const next = stems[i + 1];
      if (next) pairs.add(`${s} ${next}`);
    });
  }

  const matched: string[] = [];
  const missing: string[] = [];
  for (const keyword of keywords) {
    const found =
      keyword.stems.length === 1 ? singles.has(keyword.stems[0] as string) : pairs.has(keyword.stems.join(" "));
    (found ? matched : missing).push(keyword.term);
  }

  const coverage = keywords.length ? matched.length / keywords.length : 0;
  return { matched, missing, coverage: Math.round(coverage * 100) / 100 };
}
