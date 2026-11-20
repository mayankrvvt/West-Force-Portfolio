import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

// Daily job collector, job preferences and /api/jobs/for-me. fetch is always
// stubbed: no real Greenhouse, Lever or Jooble calls.

let app;
let Job;
let collectJobs;
let isInCanada;
const token = "token-collector";
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days) => new Date(Date.now() - days * DAY).toISOString();

beforeAll(async () => {
  const mongoose = await startMongo();
  app = await loadApp();
  ({ collectJobs } = await import("../src/modules/jobs/collect"));
  ({ isInCanada } = await import("../src/modules/jobs/sources/canada"));
  Job = mongoose.model("Job");
  testUsers.set(token, { uid: "uid-collector", email: "collector@example.com", email_verified: true });
  await request(app).post("/api/users").set("Authorization", `Bearer ${token}`).send({});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  testUsers.clear();
  await stopMongo();
});

const as = (req) => req.set("Authorization", `Bearer ${token}`);

const greenhouseJob = (id, location, extra = {}) => ({
  id,
  title: "Software Engineer",
  location: { name: location },
  absolute_url: `https://boards.greenhouse.io/acme/jobs/${id}`,
  first_published: daysAgo(1),
  content: "&lt;p&gt;Build things &amp;amp; ship.&lt;/p&gt;",
  company_name: "Acme",
  departments: [{ name: "Engineering" }],
  ...extra,
});

const leverPosting = (id, extra = {}) => ({
  id,
  text: "Support Worker",
  categories: { location: "Brampton, ON", commitment: "Full Time", team: "Care" },
  country: "CA",
  createdAt: Date.now() - DAY,
  hostedUrl: `https://jobs.lever.co/carely/${id}`,
  descriptionPlain: "Help clients at home.",
  ...extra,
});

/** Stub fetch by URL: routes maps a URL part to a body, or to an Error to throw. */
function stubFetch(routes) {
  const fetchMock = vi.fn(async (url) => {
    const match = Object.keys(routes).find((part) => String(url).includes(part));
    const body = match ? routes[match] : undefined;
    if (body instanceof Error) throw body;
    if (body === undefined) return new Response("not found", { status: 404 });
    return new Response(JSON.stringify(body), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Canada filter", () => {
  test("keeps Canadian places and Remote only when it says Canada", () => {
    for (const place of ["Toronto, ON", "Remote, Canada", "Vancouver, British Columbia", "Montréal", "Halifax, NS"]) {
      expect(isInCanada(place), place).toBe(true);
    }
    for (const place of ["Remote", "Remote, United States", "London", "New Brunswick, NJ", "Work on site"]) {
      expect(isInCanada(place), place).toBe(false);
    }
  });

  test("collector stores only jobs located in Canada", async () => {
    await Job.deleteMany({});
    stubFetch({
      "boards/acme": {
        jobs: [
          greenhouseJob(1, "Toronto, ON"),
          greenhouseJob(2, "Remote, United States"),
          greenhouseJob(3, "Remote"),
        ],
      },
    });

    await collectJobs({ greenhouse: ["acme"], lever: [] });

    const stored = await Job.find({ source: "greenhouse" });
    expect(stored.map((job) => job.externalId)).toEqual(["acme:1"]);
    expect(stored[0]).toMatchObject({
      title: "Software Engineer",
      company: "Acme",
      location: "Toronto, ON",
      description: "Build things & ship.",
    });
  });
});

describe("collectJobs", () => {
  beforeEach(async () => {
    await Job.deleteMany({});
  });

  test("a second run updates jobs instead of duplicating them", async () => {
    const sources = {
      "boards/acme": { jobs: [greenhouseJob(1, "Toronto, ON")] },
      "postings/carely": [leverPosting("p1")],
    };
    stubFetch(sources);
    const first = await collectJobs({ greenhouse: ["acme"], lever: ["carely"] });

    stubFetch(sources);
    const second = await collectJobs({ greenhouse: ["acme"], lever: ["carely"] });

    expect(first).toMatchObject({ added: 2, failed: 0 });
    expect(second).toMatchObject({ added: 0, fetched: 2 });
    expect(await Job.countDocuments()).toBe(2);
  });

  test("an undated job keeps the date it was first collected", async () => {
    const sources = { "boards/acme": { jobs: [greenhouseJob(1, "Toronto, ON", { first_published: undefined })] } };
    const firstRun = new Date(Date.now() - 3 * DAY);
    stubFetch(sources);
    await collectJobs({ greenhouse: ["acme"], lever: [], now: firstRun });

    stubFetch(sources);
    await collectJobs({ greenhouse: ["acme"], lever: [] });

    const stored = await Job.findOne({ externalId: "acme:1" });
    expect(stored.postedAt.toISOString()).toBe(firstRun.toISOString());
  });

  test("jobs posted more than 30 days ago are removed", async () => {
    await Job.create({
      source: "lever",
      externalId: "carely:old",
      title: "Old job",
      postedAt: daysAgo(40),
    });
    stubFetch({
      "boards/acme": {
        jobs: [greenhouseJob(1, "Toronto, ON"), greenhouseJob(2, "Ottawa, ON", { first_published: daysAgo(45) })],
      },
    });

    const summary = await collectJobs({ greenhouse: ["acme"], lever: [] });

    expect(summary.removed).toBe(1);
    const left = (await Job.find()).map((job) => job.externalId).sort();
    expect(left).toEqual(["acme:1"]);
  });

  test("old jobs from the dropped adzuna source are removed, even new ones", async () => {
    // The model no longer accepts "adzuna", so the old row goes in raw.
    await Job.collection.insertOne({ source: "adzuna", externalId: "a1", title: "Adzuna job", postedAt: new Date() });
    stubFetch({ "boards/acme": { jobs: [greenhouseJob(1, "Toronto, ON")] } });

    const summary = await collectJobs({ greenhouse: ["acme"], lever: [] });

    expect(summary.removed).toBe(1);
    expect(await Job.collection.countDocuments({ source: "adzuna" })).toBe(0);
  });

  test("manual jobs added by the admin are never removed, adzuna rows still are", async () => {
    await Job.create({
      source: "manual",
      externalId: "manual-old",
      title: "Old manual job",
      location: "Toronto, ON",
      postedAt: daysAgo(90),
    });
    await Job.collection.insertOne({ source: "adzuna", externalId: "a1", title: "Adzuna job", postedAt: new Date() });
    stubFetch({ "boards/acme": { jobs: [greenhouseJob(1, "Toronto, ON")] } });

    const summary = await collectJobs({ greenhouse: ["acme"], lever: [] });

    expect(summary.removed).toBe(1);
    expect(await Job.countDocuments({ source: "manual" })).toBe(1);
    expect(await Job.collection.countDocuments({ source: "adzuna" })).toBe(0);
  });

  test("one failing source does not stop the others", async () => {
    stubFetch({
      "boards/broken": new Error("network down"),
      "boards/acme": { jobs: [greenhouseJob(1, "Toronto, ON")] },
      "postings/carely": [leverPosting("p1")],
    });

    const summary = await collectJobs({ greenhouse: ["broken", "acme", "missing"], lever: ["carely"] });

    expect(summary).toMatchObject({ tried: 4, failed: 2, added: 2 });
  });

  test("Jooble is skipped without a key and searched per unique preference with one", async () => {
    await as(request(app).put("/api/users/me/job-preferences")).send({
      titles: ["Support Worker"],
      city: "Brampton",
    });

    const withoutKey = stubFetch({});
    await collectJobs({ greenhouse: [], lever: [] });
    expect(withoutKey).not.toHaveBeenCalled();

    const withKey = stubFetch({
      "jooble.org/api/": {
        jobs: [
          { id: 77, title: "Support Worker", location: "Brampton, ON", link: "https://jooble.org/j/77", updated: daysAgo(0) },
          { id: 78, title: "Support Worker", location: "Brampton, England", link: "https://jooble.org/j/78" },
        ],
      },
    });
    const summary = await collectJobs({ joobleApiKey: "fake-jooble-key", greenhouse: [], lever: [] });

    expect(summary).toMatchObject({ tried: 1, failed: 0, added: 1 });
    const [url, init] = withKey.mock.calls[0];
    expect(url).toBe("https://jooble.org/api/fake-jooble-key");
    expect(JSON.parse(init.body)).toEqual({ keywords: "Support Worker", location: "Brampton, Canada" });
  });
});

describe("job preferences", () => {
  test("needs sign-in", async () => {
    const res = await request(app).get("/api/users/me/job-preferences");
    expect(res.status).toBe(401);
  });

  test("rejects bad input", async () => {
    const tooMany = await as(request(app).put("/api/users/me/job-preferences")).send({
      titles: ["a", "b", "c", "d", "e", "f"],
    });
    const badFlag = await as(request(app).put("/api/users/me/job-preferences")).send({ remoteOk: "yes" });
    const blankTitle = await as(request(app).put("/api/users/me/job-preferences")).send({ titles: [" "] });

    expect(tooMany.status).toBe(400);
    expect(badFlag.status).toBe(400);
    expect(blankTitle.status).toBe(400);
  });

  test("partial updates merge with saved preferences", async () => {
    await as(request(app).put("/api/users/me/job-preferences")).send({
      titles: ["Support Worker", "support worker", "Cook"],
      city: "Brampton",
      remoteOk: true,
    });
    await as(request(app).put("/api/users/me/job-preferences")).send({ city: "Toronto" });
    await as(request(app).put("/api/users/me/job-preferences")).send({ remoteOk: false });
    await as(request(app).put("/api/users/me/job-preferences")).send({ province: "ON" });
    await as(request(app).put("/api/users/me/job-preferences")).send({ weeklyEmail: true });

    const res = await as(request(app).get("/api/users/me/job-preferences"));

    expect(res.status).toBe(200);
    expect(res.body.jobPreferences).toEqual({
      titles: ["Support Worker", "Cook"],
      city: "Toronto",
      province: "ON",
      remoteOk: false,
      weeklyEmail: true,
    });
  });

  test("weekly email is off by default and must be true or false", async () => {
    const bad = await as(request(app).put("/api/users/me/job-preferences")).send({ weeklyEmail: "yes" });
    const off = await as(request(app).put("/api/users/me/job-preferences")).send({ weeklyEmail: false });

    expect(bad.status).toBe(400);
    expect(off.status).toBe(200);
    expect(off.body.jobPreferences.weeklyEmail).toBe(false);
    expect(off.body.jobPreferences.city).toBe("Toronto");
  });

  test("province must be a Canadian province or territory code, or empty", async () => {
    const bad = await as(request(app).put("/api/users/me/job-preferences")).send({ province: "TX" });
    const cleared = await as(request(app).put("/api/users/me/job-preferences")).send({ province: "" });

    expect(bad.status).toBe(400);
    expect(cleared.status).toBe(200);
    expect(cleared.body.jobPreferences.province).toBe("");
  });
});

describe("GET /api/jobs/for-me and search fallback", () => {
  beforeAll(async () => {
    await Job.deleteMany({});
    const job = (externalId, title, location, days) => ({
      source: "greenhouse",
      externalId,
      title,
      location,
      postedAt: daysAgo(days),
    });
    await Job.create([
      job("g1", "Senior Support Worker", "Brampton, ON", 1),
      job("g2", "Support Worker", "Remote, Canada", 5),
      job("g3", "Support Worker", "Calgary, AB", 2),
      job("g4", "Software Engineer", "Brampton, ON", 1),
      job("g5", "Supportive Workers Lead", "Brampton, ON", 1),
    ]);
  });

  test("ranks by title, then city (or remote), with isNew and reasons", async () => {
    await as(request(app).put("/api/users/me/job-preferences")).send({
      titles: ["support worker"],
      city: "Brampton",
      province: "",
      remoteOk: true,
    });

    const res = await as(request(app).get("/api/jobs/for-me"));

    expect(res.status).toBe(200);
    // g4 (no title or skill match) never shows; g5 is only a partial title match.
    expect(res.body.jobs.map((job) => [job.externalId, job.isNew])).toEqual([
      ["g1", true],
      ["g2", false],
      ["g3", true],
      ["g5", true],
    ]);
    expect(res.body.jobs[0].reasons).toEqual(["Title match: support worker", "Brampton"]);
    expect(res.body.jobs[1].reasons).toContain("Remote");
  });

  test("without remoteOk a remote job gets no location boost", async () => {
    await as(request(app).put("/api/users/me/job-preferences")).send({ remoteOk: false });

    const res = await as(request(app).get("/api/jobs/for-me"));

    expect(res.body.jobs.map((job) => job.externalId)).toEqual(["g1", "g3", "g2", "g5"]);
    expect(res.body.jobs[2].reasons).not.toContain("Remote");
  });

  test("a newer tailored copy of a resume doesn't change jobs for you", async () => {
    const resumes = Job.db.model("Resume").collection;
    const own = { userId: "uid-collector", content: { title: "", skills: [] } };
    const { insertedId } = await resumes.insertOne({ ...own, targetRole: "Care aide", updatedAt: daysAgo(3) });
    await resumes.insertOne({
      ...own,
      targetRole: "Software Engineer Lead",
      sourceResumeId: insertedId,
      tailoredFor: { jobTitle: "Software Engineer Lead" },
      updatedAt: daysAgo(0),
    });

    const res = await as(request(app).get("/api/jobs/for-me"));

    expect(res.body.jobs.map((job) => job.externalId)).not.toContain("g4");
    await resumes.deleteMany({ userId: "uid-collector" });
  });

  test("a hidden job leaves jobs for you, and unhiding brings it back", async () => {
    const g1 = await Job.findOne({ externalId: "g1" });
    const ids = async () => (await as(request(app).get("/api/jobs/for-me"))).body.jobs.map((job) => job.externalId);

    expect(await ids()).toContain("g1");

    const hide = await as(request(app).post(`/api/jobs/${g1._id}/hide`));
    expect(hide.status).toBe(200);
    expect(await ids()).not.toContain("g1");

    const again = await as(request(app).post(`/api/jobs/${g1._id}/hide`));
    expect(again.status).toBe(200);

    const unhide = await as(request(app).delete(`/api/jobs/${g1._id}/hide`));
    expect(unhide.status).toBe(200);
    expect(await ids()).toContain("g1");
  });

  test("hiding needs sign-in and a valid job id", async () => {
    const anon = await request(app).post("/api/jobs/507f1f77bcf86cd799439011/hide");
    const bad = await as(request(app).post("/api/jobs/not-an-id/hide"));

    expect(anon.status).toBe(401);
    expect(bad.status).toBe(400);
  });

  test("/api/jobs searches the collected jobs", async () => {
    const fetchMock = stubFetch({});

    const res = await as(request(app).get("/api/jobs?query=support%20worker&location=brampton"));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, total: 1, page: 1, limit: 20, cached: false });
    expect(res.body.jobs.map((job) => job.externalId)).toEqual(["g1"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
