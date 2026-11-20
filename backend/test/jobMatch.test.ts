import { describe, expect, test } from "vitest";
import { buildProfile, scoreJob, MATCH_POINTS, type MatchProfile } from "../src/modules/jobs/match";
import { provinceOf } from "../src/modules/jobs/sources/canada";

// Pure "jobs for you" scoring: no database, no AI.
const NOW = new Date("2026-11-20T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

const EMMA: MatchProfile = {
  titles: ["Personal support worker"],
  skills: ["CPR", "Dementia care", "Hoyer lift"],
  city: "Brampton",
  province: "ON",
  remoteOk: true,
};

const job = (extra: Record<string, unknown> = {}) => ({
  title: "Personal Support Worker",
  location: "Brampton, ON",
  description: "",
  tags: [] as string[],
  postedAt: daysAgo(30),
  ...extra,
});

describe("provinceOf", () => {
  test("reads codes, names and known cities", () => {
    expect(provinceOf("Brampton, ON")).toBe("ON");
    expect(provinceOf("Montréal, Québec")).toBe("QC");
    expect(provinceOf("Halifax")).toBe("NS");
    expect(provinceOf("Richmond Hill")).toBe("ON");
    expect(provinceOf("Remote, Canada")).toBe("");
  });
});

describe("scoreJob", () => {
  test("a full title match beats a partial one, and no match scores 0", () => {
    const full = scoreJob(job(), EMMA, NOW);
    const partial = scoreJob(job({ title: "Support worker" }), EMMA, NOW);
    const none = scoreJob(job({ title: "Software engineer" }), EMMA, NOW);

    expect(full.score).toBeGreaterThan(partial.score);
    expect(partial.score).toBeGreaterThan(0);
    expect(none).toEqual({ score: 0, reasons: [] });
  });

  test("location order is same city, then same province, then remote", () => {
    const city = scoreJob(job(), EMMA, NOW).score;
    const province = scoreJob(job({ location: "Toronto, ON" }), EMMA, NOW).score;
    const remote = scoreJob(job({ location: "Remote, Canada" }), EMMA, NOW).score;
    const elsewhere = scoreJob(job({ location: "Calgary, AB" }), EMMA, NOW).score;

    expect(city).toBeGreaterThan(province);
    expect(province).toBeGreaterThan(remote);
    expect(remote).toBeGreaterThan(elsewhere);
  });

  test("remote only counts when remoteOk", () => {
    const remote = job({ location: "Remote, Canada" });
    expect(scoreJob(remote, { ...EMMA, remoteOk: false }, NOW).score).toBe(
      scoreJob(job({ location: "Calgary, AB" }), EMMA, NOW).score
    );
  });

  test("province comes from the city when it is not set", () => {
    const noProvince = { ...EMMA, province: "" };
    expect(scoreJob(job({ location: "Toronto, ON" }), noProvince, NOW).reasons).toContain("Ontario");
  });

  test("gives readable reasons", () => {
    const result = scoreJob(
      job({ tags: ["CPR"], description: "Dementia care experience needed." }),
      EMMA,
      NOW
    );

    expect(result.reasons).toEqual(["Title match: Personal support worker", "Matches: CPR, Dementia care", "Brampton"]);
  });

  test("skills alone can match, but each skill and the skill total are capped", () => {
    const many = Array.from({ length: 30 }, (_, i) => `skill${i}`);
    const noisy: MatchProfile = { titles: [], skills: many, city: "", province: "", remoteOk: false };
    const description = many.join(" ");

    const inText = scoreJob(job({ title: "Care aide", description }), noisy, NOW);
    expect(inText.score).toBe(MATCH_POINTS.skillTotal);

    const one: MatchProfile = { ...noisy, skills: ["CPR"] };
    const everywhere = scoreJob(job({ title: "CPR trainer", tags: ["CPR"], description: "CPR CPR CPR" }), one, NOW);
    expect(everywhere.score).toBe(MATCH_POINTS.skillTitle);

    // A full title match always beats any number of skills.
    expect(MATCH_POINTS.titleFull).toBeGreaterThan(MATCH_POINTS.skillTotal);
  });

  test("newer jobs get a small boost", () => {
    const fresh = scoreJob(job({ postedAt: daysAgo(1) }), EMMA, NOW).score;
    const old = scoreJob(job({ postedAt: daysAgo(40) }), EMMA, NOW).score;
    expect(fresh - old).toBe(MATCH_POINTS.fresh);
  });

  test("with no preferences, resume or skills nothing matches", () => {
    const empty = buildProfile({});
    expect(empty).toEqual({ titles: [], skills: [], city: "", province: "", remoteOk: false });
    expect(scoreJob(job(), empty, NOW)).toEqual({ score: 0, reasons: [] });
  });
});

describe("buildProfile", () => {
  test("merges preferences, the latest resume and portfolio skills without repeats", () => {
    const profile = buildProfile({
      preferences: { titles: ["Personal support worker"], city: " Brampton ", province: "ON", remoteOk: true },
      resume: { targetRole: "personal support worker", content: { title: "PSW", skills: ["CPR", "cpr"] } },
      portfolioSkills: ["Dementia care", { name: "CPR" }, { name: "" }, 42],
    });

    expect(profile).toEqual({
      titles: ["Personal support worker", "PSW"],
      skills: ["CPR", "Dementia care"],
      city: "Brampton",
      province: "ON",
      remoteOk: true,
    });
  });

  test("ignores the untouched default resume role so it can't pull in software jobs", () => {
    const profile = buildProfile({
      preferences: { titles: ["Personal support worker"] },
      resume: { targetRole: "Software Engineer", content: { title: "", skills: [] } },
    });

    expect(profile.titles).toEqual(["Personal support worker"]);
  });
});
