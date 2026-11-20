/*
 * Maps Gemini's free-form resume JSON to the shape the API returns.
 * Missing or wrong-typed fields fall back to safe defaults.
 */

export type ResumePayload = {
  targetRole?: string;
  country?: string;
  experienceLevel?: string;
};

type JsonObject = Record<string, unknown>;

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const asObject = (value: unknown): JsonObject => (isJsonObject(value) ? value : {});
const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? (value as unknown[]) : []);
const asNumberOr = <T>(value: unknown, fallback: T): number | T =>
  typeof value === "number" ? value : fallback;

/** `value || fallback`, like the original JS: any falsy value uses the fallback. */
function or(value: unknown, fallback: unknown): unknown {
  return value || fallback;
}

export function normalizeResume(resume: unknown, payload: ResumePayload = {}, model: string) {
  const source = asObject(resume);
  const content = asObject(source.content);

  return {
    id: or(source.id, `gemini-${Date.now()}`),
    title: or(source.title, `${payload.targetRole || "Professional"} Resume`),
    fileName: or(source.fileName, "WestForce_Resume.pdf"),
    version: or(source.version, 1),
    status: or(source.status, "draft"),
    template: or(source.template, "canadian-ats"),
    targetRole: or(source.targetRole, payload.targetRole || "Software Engineer"),
    country: or(source.country, payload.country || "Canada"),
    experienceLevel: or(source.experienceLevel, payload.experienceLevel || "Entry Level"),
    atsScore: asNumberOr(source.atsScore, null),
    updatedAt: or(source.updatedAt, new Date().toISOString()),

    content: {
      name: or(content.name, ""),
      title: or(content.title, ""),
      email: or(content.email, ""),
      phone: or(content.phone, ""),
      location: or(content.location, ""),
      linkedin: or(content.linkedin, ""),
      github: or(content.github, ""),
      website: or(content.website, ""),
      summary: or(content.summary, ""),
      experience: asArray(content.experience),
      education: asArray(content.education),
      skills: asArray(content.skills),
      projects: asArray(content.projects),
      certifications: asArray(content.certifications),
    },

    ai: {
      provider: "Google Gemini",
      model,
      generatedAt: new Date().toISOString(),
    },
  };
}

/** The enhance response: the resume, the change list and the ATS analysis. */
export function normalizeEnhanceResult(parsed: unknown, payload: ResumePayload, model: string) {
  const source = asObject(parsed);
  const atsAnalysis = asObject(source.atsAnalysis);

  return {
    resume: normalizeResume(source.resume || source, payload, model),
    changes: asArray(source.changes),
    atsAnalysis: {
      jobDescriptionKeywords: asArray(atsAnalysis.jobDescriptionKeywords),
      matchedKeywords: asArray(atsAnalysis.matchedKeywords),
      missingKeywords: asArray(atsAnalysis.missingKeywords),
      keywordCoverage: asNumberOr(atsAnalysis.keywordCoverage, 0),
      requiredSkills: asArray(atsAnalysis.requiredSkills),
      preferredSkills: asArray(atsAnalysis.preferredSkills),
      formattingIssues: asArray(atsAnalysis.formattingIssues),
      suggestions: asArray(atsAnalysis.suggestions),
      scoreBefore: asNumberOr(atsAnalysis.scoreBefore, null),
      scoreAfter: asNumberOr(atsAnalysis.scoreAfter, null),
    },
  };
}
