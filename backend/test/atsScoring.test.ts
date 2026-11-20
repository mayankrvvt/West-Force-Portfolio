import { describe, expect, test } from "vitest";
import { extractJobKeywords, matchKeywords, normalise, stem, tokenize } from "../src/modules/ats/keywords";
import {
  factsFromContent,
  factsFromText,
  lengthBand,
  scoreResume,
  totalScore,
  WEIGHTS,
  type ScoreCheck,
} from "../src/modules/ats/scoring";

// Pure scoring: no database, no AI.
const JOB = `Personal support worker
We need a personal support worker for long-term care in Brampton.
Provide personal care, dementia care and medication reminders.
Personal support worker certificate and CPR required. Experience with Hoyer lift equipment.
Strong charting and care documentation skills.`;

const GOOD_RESUME = `Emma Tremblay
emma.tremblay@example.com | 416-555-0134 | Brampton, ON | linkedin.com/in/emmatremblay

SUMMARY
Personal support worker with 4 years in long-term care and dementia care.

EXPERIENCE
Personal support worker, Peel Manor, Brampton, ON
Jan 2022 - Present
- Provided personal care to 12 residents per shift in a dementia care unit.
- Managed medication reminders for 20 residents with zero missed doses.
- Documented care notes in Point Click Care for 3 units.
- Trained 4 new staff on safe Hoyer lift equipment use.

Home support worker, CarePoint Home Health, Mississauga, ON
Mar 2020 - Dec 2021
- Supported 8 clients a week with bathing, meals and mobility.
- Reduced missed visits by 30% by planning routes each morning.

EDUCATION
Personal support worker certificate, Sheridan College, 2019

SKILLS
Personal care, dementia care, CPR, charting, care documentation, Hoyer lift, first aid
`;

const byId = (checks: ScoreCheck[], id: string) => {
  const found = checks.find((check) => check.id === id);
  if (!found) throw new Error(`No ${id} check`);
  return found;
};

describe("keywords", () => {
  test("normalise keeps c++, c# and node.js but drops punctuation", () => {
    expect(normalise("C++, C# and Node.js!")).toBe("c++ c# and node.js");
    expect(tokenize("CPR (current).")).toEqual(["cpr", "current"]);
  });

  test("managing, managed and management all match", () => {
    expect(stem("managing")).toBe(stem("managed"));
    expect(stem("management")).toBe(stem("managed"));

    const keywords = extractJobKeywords("Management of the unit.");
    for (const resume of ["Managing a unit", "Managed staff", "Change management"]) {
      expect(matchKeywords(resume, keywords).matched).toContain("management");
    }
  });

  test("stopwords are ignored", () => {
    const terms = extractJobKeywords("The ideal candidate will have a strong ability to work with the team and Excel.").map(
      (keyword) => keyword.term
    );

    expect(terms).toEqual(["excel"]);
  });

  test("pairs that appear twice are kept and ranked first", () => {
    const keywords = extractJobKeywords(JOB);

    expect(keywords[0]?.term).toBe("personal support");
    expect(keywords.map((keyword) => keyword.term)).toContain("cpr");
  });

  test("places, benefit and equal opportunity words and the employer name are dropped", () => {
    const ad =
      "Peel Home Care is hiring in Brampton, Ontario. Peel Home Care needs CPR. " +
      "Benefits: dental, vacation, competitive salary. We are an equal opportunity employer. Apply today in Toronto, ON.";
    const terms = extractJobKeywords(ad, 25, "Peel Home Care").map((keyword) => keyword.term);

    expect(terms).toContain("cpr");
    for (const word of ["peel", "brampton", "ontario", "toronto", "benefits", "dental", "vacation", "salary", "equal", "opportunity", "employer", "apply"]) {
      expect(terms.join(" ")).not.toContain(word);
    }
    // Without the employer name, "home care" still counts as a job keyword.
    expect(extractJobKeywords("Home care work. Home care visits.").map((k) => k.term)).toContain("home care");
  });
});

describe("scoreResume", () => {
  test("weights sum to 100", () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
    expect(scoreResume(factsFromText(GOOD_RESUME), JOB).reduce((a, c) => a + c.weight, 0)).toBe(100);
  });

  test("a strong resume passes most checks", () => {
    const checks = scoreResume(factsFromText(GOOD_RESUME), JOB);

    for (const id of ["sections", "bullets", "contact", "dates", "readability"]) {
      expect(byId(checks, id).status).toBe("pass");
    }
    expect(totalScore(checks)).toBeGreaterThan(75);
  });

  test("missing sections and missing contact details are flagged", () => {
    const checks = scoreResume(factsFromText("Emma Tremblay\n\nEXPERIENCE\n- Helped residents with meals."), JOB);
    const sections = byId(checks, "sections");
    const contact = byId(checks, "contact");

    expect(sections.status).toBe("fail");
    expect(sections.detail).toContain("Education");
    expect(sections.fixes).toContain("Add a Skills section with a plain heading.");
    expect(contact.status).toBe("fail");
    expect(contact.points).toBe(0);
    expect(contact.fixes).toContain("Add your email address at the top.");
  });

  test("length bands", () => {
    expect(lengthBand(100)).toMatchObject({ status: "fail", points: 2 });
    expect(lengthBand(200)).toMatchObject({ status: "warn", points: 6 });
    expect(lengthBand(500)).toMatchObject({ status: "pass", points: 10 });
    expect(lengthBand(1000)).toMatchObject({ status: "warn", points: 6 });
    expect(lengthBand(1500)).toMatchObject({ status: "fail", points: 3 });
  });

  test("mixed date formats warn; one format passes", () => {
    const mixed = byId(scoreResume(factsFromText("EXPERIENCE\nJan 2022 - Present\n03/2020 - 12/2021"), JOB), "dates");
    const same = byId(scoreResume(factsFromText("EXPERIENCE\nJan 2022 - Present\nMar 2020 - Dec 2021"), JOB), "dates");
    const none = byId(scoreResume(factsFromText("EXPERIENCE\nPeel Manor"), JOB), "dates");

    expect(mixed.status).toBe("warn");
    expect(mixed.points).toBe(5);
    expect(same.status).toBe("pass");
    expect(none.status).toBe("fail");
  });

  test("bullets with action words and numbers pass; vague ones do not", () => {
    const strong = byId(scoreResume(factsFromText(GOOD_RESUME), JOB), "bullets");
    const vague = byId(
      scoreResume(factsFromText("- Responsible for residents\n- Duties included meals\n- Was on the night shift"), JOB),
      "bullets"
    );

    expect(strong.status).toBe("pass");
    expect(strong.points).toBe(15);
    expect(vague.status).not.toBe("pass");
    expect(vague.fixes.length).toBeGreaterThan(0);
  });

  test("a saved resume's fields give the same kind of facts", () => {
    const facts = factsFromContent(
      {
        email: "a@example.com",
        phone: "",
        location: "Brampton, ON",
        summary: "",
        experience: [{ startDate: "Jan 2022", endDate: "Present", bullets: ["Managed 10 rooms."] }],
        education: [],
        skills: ["CPR"],
      },
      "CPR"
    );

    expect(facts.sections).toEqual({ summary: false, experience: true, education: false, skills: true });
    expect(facts.contact).toEqual({ email: true, phone: false, location: true, linkedin: false });
    expect(facts.dates).toEqual(["Jan 2022"]);
  });

  test("is deterministic", () => {
    const first = scoreResume(factsFromText(GOOD_RESUME), JOB);
    const second = scoreResume(factsFromText(GOOD_RESUME), JOB);

    expect(second).toEqual(first);
    expect(totalScore(second)).toBe(totalScore(first));
  });
});
