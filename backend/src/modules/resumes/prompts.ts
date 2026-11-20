/*
 * Prompt text for the resume AI calls. Kept apart from ai.service.ts so the
 * Gemini call code stays short. The wording is unchanged from the original.
 */

export type BuildPromptInput = {
  portfolio: unknown;
  targetRole: string;
  country: string;
  experienceLevel: string;
};

export type EnhancePromptInput = {
  resumeText: string;
  portfolio: unknown;
  jobDescription: string;
  options: unknown;
  targetRole: string;
  country: string;
};

/** Prompt for building a new resume from portfolio data. */
export function buildResumePrompt({
  portfolio,
  targetRole,
  country,
  experienceLevel,
}: BuildPromptInput): string {
  return `
You are an expert professional resume writer specializing in the Canadian job market.

Create a professional, ATS-friendly resume using ONLY the information provided in the portfolio.

TARGET ROLE:
${targetRole}

COUNTRY:
${country}

EXPERIENCE LEVEL:
${experienceLevel}

IMPORTANT RULES:

1. Never invent facts.
2. Never invent employers.
3. Never invent dates.
4. Never invent degrees.
5. Never invent certifications.
6. Never invent technologies.
7. Never invent achievements.
8. Never invent numbers, percentages, users, revenue, performance improvements, or other metrics.
9. If a metric is not provided, write the achievement without a fabricated metric.
10. Do not add a photograph.
11. Do not add age.
12. Do not add date of birth.
13. Do not add marital status.
14. Do not add passport information.
15. Do not add religion.
16. Do not add nationality unless it is explicitly relevant and supplied.
17. Use professional Canadian English.
18. Use concise, ATS-friendly wording.
19. Prioritize information relevant to the target role.
20. Use reverse chronological order for experience and education.
21. Strengthen weak descriptions while preserving their factual meaning.
22. Use strong action verbs.
23. Avoid keyword stuffing.
24. Do not claim technologies that are not present in the supplied information.
25. Keep the resume suitable for Canadian employers.
26. The resume should normally fit within 1-2 pages depending on the amount of information.
27. Return ONLY valid JSON.
28. Do not wrap the JSON in markdown.

PORTFOLIO DATA:

${JSON.stringify(portfolio, null, 2)}

Return this exact JSON structure:

{
  "title": "Software Engineer Resume",
  "fileName": "WestForce_Resume.pdf",
  "version": 1,
  "status": "draft",
  "template": "canadian-ats",
  "targetRole": "${targetRole}",
  "country": "${country}",
  "experienceLevel": "${experienceLevel}",
  "content": {
    "name": "",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "website": "",
    "summary": "",
    "experience": [
      {
        "id": "",
        "company": "",
        "position": "",
        "location": "",
        "startDate": "",
        "endDate": "",
        "bullets": []
      }
    ],
    "education": [
      {
        "id": "",
        "institution": "",
        "degree": "",
        "field": "",
        "location": "",
        "startDate": "",
        "endDate": "",
        "description": ""
      }
    ],
    "skills": [],
    "projects": [
      {
        "id": "",
        "name": "",
        "description": "",
        "technologies": [],
        "bullets": []
      }
    ],
    "certifications": [
      {
        "id": "",
        "name": "",
        "issuer": "",
        "year": ""
      }
    ]
  }
}
`;
}

/** Prompt for enhancing an existing resume, with ATS analysis against a job description. */
export function enhanceResumePrompt({
  resumeText,
  portfolio,
  jobDescription,
  options,
  targetRole,
  country,
}: EnhancePromptInput): string {
  const selectedOptions =
    Array.isArray(options) && options.length
      ? options.join(", ")
      : "summary, experience, keywords, ats";

  const hasJobDescription =
    typeof jobDescription === "string" &&
    jobDescription.trim().length > 0;

  return `
You are an expert Canadian resume editor and ATS optimization specialist.

Your task is to improve the user's resume AND, when a Job Description is supplied, perform a JOB-DESCRIPTION-BASED ATS ANALYSIS.

TARGET ROLE:
${targetRole}

COUNTRY:
${country}

REQUESTED IMPROVEMENTS:
${selectedOptions}

=========================================================
SOURCE RESUME
=========================================================

${resumeText}

=========================================================
VERIFIED PORTFOLIO INFORMATION
=========================================================

${JSON.stringify(portfolio, null, 2)}

=========================================================
JOB DESCRIPTION
=========================================================

${
  hasJobDescription
    ? jobDescription
    : "No job description was provided."
}

=========================================================
RESUME ENHANCEMENT RULES
=========================================================

1. Preserve all factual information.

2. Never invent experience.

3. Never invent dates.

4. Never invent employers.

5. Never invent technologies.

6. Never invent achievements.

7. Never invent metrics.

8. Never invent education.

9. Never invent certifications.

10. If the existing resume conflicts with the portfolio, do not silently invent a correction.

11. Improve grammar and professional wording.

12. Improve bullet points using strong action verbs.

13. Improve keyword relevance for the target role.

14. Keep the resume ATS-friendly.

15. Use professional Canadian English.

16. Do not add a photo.

17. Do not add age.

18. Do not add date of birth.

19. Do not add marital status.

20. Do not add passport information.

21. Keep the resume concise.

22. Only modify sections requested by the user when possible.

23. Never add a skill simply because it appears in the Job Description if the user's resume or portfolio does not demonstrate that skill.

=========================================================
JOB DESCRIPTION ATS ANALYSIS
=========================================================

This section is extremely important.

If a Job Description is provided, analyze THAT JOB DESCRIPTION specifically.

DO NOT perform generic keyword extraction.

DO NOT simply extract frequently occurring words.

DO NOT treat every noun as an ATS keyword.

DO NOT treat company names as skills.

DO NOT treat people's names as skills.

DO NOT treat locations as skills.

DO NOT treat generic recruiting language as keywords.

DO NOT treat filler words as keywords.

For example, words such as:

"looking"
"motivated"
"enthusiastic"
"freshers"
"join"
"suitable"
"interested"
"developers"
"technology"

should NOT normally be reported as missing ATS keywords.

Instead, identify meaningful job-related requirements.

Extract only meaningful categories such as:

- Programming languages
- Frameworks
- Libraries
- Databases
- Tools
- Platforms
- APIs
- Software engineering concepts
- Development methodologies
- Testing technologies
- Technical competencies
- Job-specific responsibilities
- Education requirements
- Certifications
- Relevant professional competencies
- Meaningful soft skills when explicitly required

=========================================================
IMPORTANT REQUIREMENT LOGIC
=========================================================

Understand the meaning of the Job Description.

For example:

"Knowledge of any one programming language such as Java,
Python, JavaScript, C++, or C#."

This means the candidate needs ANY ONE of those languages.

Do NOT automatically classify all five languages as individually required missing skills.

Similarly:

"Preferred Skills"

means those skills are preferred rather than mandatory.

Similarly:

"an advantage"

means the skill is preferred/advantageous rather than strictly required.

Similarly:

"basic knowledge"

means the requirement is at a basic level.

Similarly:

"experience with X"

means X is an experience requirement.

Similarly:

"knowledge of X"

means X is a knowledge requirement.

Preserve these distinctions in the ATS analysis.

=========================================================
KEYWORD NORMALIZATION
=========================================================

Normalize equivalent terminology.

Examples:

"Object-Oriented Programming"
"OOP"

should be treated as the same concept.

"Software Development Life Cycle"
"Software Development Lifecycle"
"SDLC"

should be treated as the same concept.

"REST API"
"REST APIs"
"RESTful API"
"RESTful APIs"

should be treated as the same concept.

"GitHub"
should remain GitHub.

"JavaScript"
"JS"

may be treated as equivalent when appropriate.

"React.js"
"React"

may be treated as equivalent when clearly referring to the same technology.

"Node.js"
"Node"

may be treated as equivalent when clearly referring to Node.js.

Do not incorrectly merge unrelated technologies.

=========================================================
JOB DESCRIPTION KEYWORDS
=========================================================

Create a clean list called "jobDescriptionKeywords".

Every keyword must:

1. Be genuinely relevant to the job.
2. Come from the supplied Job Description.
3. Represent a skill, technology, competency, responsibility, qualification, or meaningful requirement.
4. NOT be a generic filler word.
5. NOT be a company name.
6. NOT be a person's name.
7. NOT be a random word extracted because it appears frequently.

For each keyword identify its importance:

"required"
"preferred"
or
"general"

=========================================================
RESUME MATCHING
=========================================================

Compare the meaningful Job Description keywords against:

- Resume text
- Resume skills
- Resume experience
- Resume projects
- Resume education
- Resume certifications

A keyword is MATCHED if the resume clearly demonstrates or explicitly contains the skill/concept.

A keyword is MISSING if the Job Description meaningfully requires it and it is not demonstrated in the resume.

Do NOT mark a keyword missing just because the exact spelling differs.

For example:

Resume:
"Built RESTful backend services."

Job Description:
"REST APIs"

This should be considered MATCHED.

Resume:
"Object-oriented programming using Java."

Job Description:
"OOP"

This should be considered MATCHED.

=========================================================
MISSING KEYWORDS RULE
=========================================================

The "missingKeywords" list must contain ONLY meaningful keywords from the Job Description that are genuinely absent from the resume.

Never return generic words such as:

- looking
- motivated
- enthusiastic
- freshers
- join
- suitable
- interested
- development
- developers
- technology

unless one of those words is actually a meaningful technical requirement in context.

Do not report company names.

Do not report location names.

Do not report random nouns.

Do not report ordinary English words.

=========================================================
MATCHED KEYWORDS
=========================================================

Return keywords from the Job Description that are already demonstrated in the resume.

Each matched keyword should include:

- keyword
- importance
- evidence

Example:

{
  "keyword": "Java",
  "importance": "preferred",
  "evidence": "Java appears in the Technical Skills section."
}

=========================================================
MISSING KEYWORDS
=========================================================

Each missing keyword should include:

- keyword
- importance
- reason

Example:

{
  "keyword": "Docker",
  "importance": "preferred",
  "reason": "Docker is mentioned in the Job Description but is not demonstrated in the supplied resume or portfolio."
}

=========================================================
DO NOT ENCOURAGE FABRICATION
=========================================================

If a Job Description contains a technology or skill that the candidate does not have:

DO NOT tell the candidate to falsely add it.

Instead say:

"Add this skill only if you have genuine experience with it."

=========================================================
ATS RECOMMENDATIONS
=========================================================

Recommendations must be based specifically on the Job Description.

Good recommendation:

"Highlight REST API development in your project descriptions because REST APIs are listed in the Job Description."

Bad recommendation:

"Add the word motivated."

Good recommendation:

"Your resume demonstrates Java and JavaScript, which align with the programming-language requirements."

Bad recommendation:

"Add Bharat Soft Technologies."

Recommendations must be useful and actionable.

=========================================================
ATS ANALYSIS OUTPUT
=========================================================

Return:

"jobDescriptionKeywords"

"matchedKeywords"

"missingKeywords"

"keywordCoverage"

"formattingIssues"

"suggestions"

"requiredSkills"

"preferredSkills"

"scoreBefore"

"scoreAfter"

For keywordCoverage, provide a meaningful percentage based on the relevant Job Description keywords.

Do not inflate the score.

Do not use arbitrary keyword counts.

=========================================================
IMPORTANT
=========================================================

The ATS analysis MUST be based on the actual Job Description supplied above.

Do not generate generic ATS keywords.

Do not extract random words.

Do not use company names.

Do not use filler words.

Do not confuse ordinary English words with skills.

Return ONLY valid JSON.

=========================================================
RETURN FORMAT
=========================================================

{
  "resume": {
    "title": "",
    "fileName": "WestForce_Enhanced_Resume.pdf",
    "version": 2,
    "status": "draft",
    "template": "canadian-ats",
    "targetRole": "${targetRole}",
    "country": "${country}",
    "content": {
      "name": "",
      "title": "",
      "email": "",
      "phone": "",
      "location": "",
      "linkedin": "",
      "github": "",
      "website": "",
      "summary": "",
      "experience": [],
      "education": [],
      "skills": [],
      "projects": [],
      "certifications": []
    }
  },

  "atsAnalysis": {
    "jobDescriptionKeywords": [],

    "matchedKeywords": [],

    "missingKeywords": [],

    "keywordCoverage": 0,

    "requiredSkills": [],

    "preferredSkills": [],

    "formattingIssues": [],

    "suggestions": [],

    "scoreBefore": 0,

    "scoreAfter": 0
  },

  "changes": []
}
`;
}
