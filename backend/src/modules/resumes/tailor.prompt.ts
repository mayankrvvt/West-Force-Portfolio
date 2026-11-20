/*
 * Prompt for tailoring a saved resume to one job ad. The reply only lists
 * changes; the server applies them and copies every fixed fact back from the
 * original (see tailor.service.ts), so the prompt is not the only guard.
 */

export type TailorPromptInput = {
  content: unknown;
  jobDescription: string;
  jobTitle?: string;
  company?: string;
};

export function tailorResumePrompt({
  content,
  jobDescription,
  jobTitle,
  company,
}: TailorPromptInput): string {
  const target = [jobTitle, company].filter(Boolean).join(" at ") || "the job below";

  return `
You tailor a Canadian job seeker's resume to one job ad: ${target}.

Rules you must follow:
- Never invent experience. Do not add employers, job titles, dates, schools, degrees, certificates, numbers or tools the person has not already listed.
- Only reword what is there so it matches the language of the job ad.
- You may rewrite the summary.
- You may rewrite existing bullets. Refer to them by experienceIndex and bulletIndex (both start at 0). Do not add new bullets.
- Keep the original skills in their order. You may add a skill at the end only when the resume already shows it somewhere.
- Use plain Canadian English. No first person.

Return JSON only, in this shape:
{
  "summary": "new summary text",
  "bullets": [
    { "experienceIndex": 0, "bulletIndex": 1, "text": "rewritten bullet", "reason": "why this helps" }
  ],
  "skills": ["original skills in the same order, then any added skills"],
  "addedKeywords": ["job ad keywords you worked in"],
  "reasons": { "summary": "why the summary changed", "skills": "why the skills changed" }
}

Resume (JSON):
${JSON.stringify(content, null, 2)}

Job ad:
${jobDescription}
`.trim();
}
