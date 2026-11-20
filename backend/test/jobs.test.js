import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

// /api/jobs searches only the jobs the daily collector stored, in Canada.
// fetch is stubbed to prove no outside call is made.

let app;
let mongoose;
let Job;
const token = "token-jobs";

beforeAll(async () => {
  mongoose = await startMongo();
  app = await loadApp();
  Job = mongoose.model("Job");
  testUsers.set(token, { uid: "uid-jobs", email: "jobs@example.com", email_verified: true });
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await Job.collection.deleteMany({});
});

afterAll(async () => {
  testUsers.clear();
  await stopMongo();
});

const as = (req) => req.set("Authorization", `Bearer ${token}`);

// Old rows the model no longer accepts (source "adzuna") go in raw.
const insertRaw = (doc) =>
  Job.collection.insertOne({ company: "", description: "", tags: [], postedAt: new Date(), ...doc });

function stubFetch() {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("GET /api/jobs", () => {
  test("needs sign-in", async () => {
    const res = await request(app).get("/api/jobs");
    expect(res.status).toBe(401);
  });

  test("with no jobs gives an empty list, not an error", async () => {
    const fetchMock = stubFetch();

    const res = await as(request(app).get("/api/jobs?query=react"));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, jobs: [], total: 0, page: 1, limit: 20, cached: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("never returns a non-collected or non-Canadian job", async () => {
    const fetchMock = stubFetch();
    await Job.create([
      { source: "lever", externalId: "c1", title: "React Developer", location: "Ottawa, ON" },
      { source: "greenhouse", externalId: "c2", title: "React Developer", location: "Montréal, Québec" },
      { source: "greenhouse", externalId: "us1", title: "React Developer", location: "Austin, TX" },
      { source: "jooble", externalId: "r1", title: "React Developer", location: "Remote" },
    ]);
    await insertRaw({ source: "adzuna", externalId: "a1", title: "React Developer", location: "Toronto, ON" });

    const res = await as(request(app).get("/api/jobs?query=react"));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.jobs.map((job) => job.externalId).sort()).toEqual(["c1", "c2"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("pages through collected jobs, newest first", async () => {
    const day = 24 * 60 * 60 * 1000;
    await Job.create(
      [1, 2, 3].map((n) => ({
        source: "lever",
        externalId: `p${n}`,
        title: "Nurse",
        location: "Calgary, AB",
        postedAt: new Date(Date.now() - n * day),
      }))
    );

    const res = await as(request(app).get("/api/jobs?query=nurse&page=2&limit=2"));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 3, page: 2, limit: 2, cached: false });
    expect(res.body.jobs.map((job) => job.externalId)).toEqual(["p3"]);
  });

  test("location search treats province names and codes as the same", async () => {
    await Job.create({ source: "lever", externalId: "t1", title: "Nurse", location: "Toronto, ON" });
    const found = async (location) => {
      const res = await as(request(app).get(`/api/jobs?query=nurse&location=${encodeURIComponent(location)}`));
      expect(res.status).toBe(200);
      return res.body.jobs.map((job) => job.externalId);
    };

    expect(await found("Toronto Ontario")).toEqual(["t1"]);
    expect(await found("Toronto, ON")).toEqual(["t1"]);
    expect(await found("toronto")).toEqual(["t1"]);
    expect(await found("Ontario")).toEqual(["t1"]);
    expect(await found("Ottawa")).toEqual([]);
    expect(await found("Ottawa Ontario")).toEqual([]);
  });

  test("rejects bad paging", async () => {
    const res = await as(request(app).get("/api/jobs?limit=500"));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/jobs/:id", () => {
  test("returns a collected Canadian job", async () => {
    const job = await Job.create({ source: "lever", externalId: "c1", title: "Nurse", location: "Ottawa, ON" });

    const res = await as(request(app).get(`/api/jobs/${job._id}`));

    expect(res.status).toBe(200);
    expect(res.body.job.externalId).toBe("c1");
  });

  test("ignores source adzuna and jobs outside Canada", async () => {
    const { insertedId } = await insertRaw({ source: "adzuna", externalId: "a1", title: "Nurse", location: "Toronto, ON" });
    const abroad = await Job.create({ source: "greenhouse", externalId: "us1", title: "Nurse", location: "Austin, TX" });

    const adzuna = await as(request(app).get(`/api/jobs/${insertedId}`));
    const outside = await as(request(app).get(`/api/jobs/${abroad._id}`));

    expect(adzuna.status).toBe(404);
    expect(outside.status).toBe(404);
  });

  test("unknown or invalid ids give 404", async () => {
    const missing = await as(request(app).get(`/api/jobs/${new mongoose.Types.ObjectId()}`));
    const invalid = await as(request(app).get("/api/jobs/not-an-id"));

    expect(missing.status).toBe(404);
    expect(invalid.status).toBe(404);
  });
});

describe("recommendedJobs", () => {
  test("ignores source adzuna and jobs outside Canada", async () => {
    const { recommendedJobs } = await import("../src/modules/jobs/service");
    await Job.init(); // text index, so the hint path runs
    await Job.create([
      { source: "lever", externalId: "c1", title: "React Developer", location: "Toronto, ON" },
      { source: "greenhouse", externalId: "us1", title: "React Developer", location: "Austin, TX" },
    ]);
    await insertRaw({ source: "adzuna", externalId: "a1", title: "React Developer", location: "Toronto, ON" });

    const byHint = await recommendedJobs("React Developer", 10);
    const newest = await recommendedJobs(undefined, 10);

    expect(byHint.map((job) => job.externalId)).toEqual(["c1"]);
    expect(newest.map((job) => job.externalId)).toEqual(["c1"]);
  });
});

describe("GET /api/jobs/for-me (ranked jobs for you)", () => {
  const forMeToken = "token-for-me";
  const uid = "uid-for-me";
  const forMe = (req) => req.set("Authorization", `Bearer ${forMeToken}`);
  const day = 24 * 60 * 60 * 1000;
  const posted = (days) => new Date(Date.now() - days * day);

  beforeAll(async () => {
    testUsers.set(forMeToken, { uid, email: "forme@example.com", email_verified: true });
    await forMe(request(app).post("/api/users")).send({});
  });

  afterEach(async () => {
    await mongoose.model("Resume").collection.deleteMany({ userId: uid });
    await mongoose.model("Portfolio").collection.deleteMany({});
  });

  test("needs sign-in", async () => {
    const res = await request(app).get("/api/jobs/for-me");
    expect(res.status).toBe(401);
  });

  test("with no preferences, resume or skills gives an empty list", async () => {
    await Job.create({ source: "lever", externalId: "n1", title: "Nurse", location: "Ottawa, ON" });

    const res = await forMe(request(app).get("/api/jobs/for-me"));

    expect(res.status).toBe(200);
    expect(res.body.jobs).toEqual([]);
  });

  test("ranks listed jobs by title, skills and place, with reasons", async () => {
    await Job.init(); // text index, so the candidate search runs
    await forMe(request(app).put("/api/users/me/job-preferences")).send({
      titles: ["Personal support worker"],
      city: "Brampton",
      province: "ON",
      remoteOk: true,
    });
    await mongoose.model("Resume").collection.insertOne({
      userId: uid,
      targetRole: "Personal support worker",
      content: { title: "", skills: ["CPR", "Dementia care"] },
      updatedAt: new Date(),
    });
    const user = await mongoose.model("User").findOne({ firebaseUid: uid });
    await mongoose.model("Portfolio").collection.insertOne({ userId: user._id, slug: "for-me", skills: ["Hoyer lift"] });

    const base = { source: "lever", description: "", tags: [] };
    await Job.create([
      { ...base, externalId: "f-city", title: "Personal Support Worker", location: "Brampton, ON", tags: ["CPR"], postedAt: posted(10) },
      { ...base, externalId: "f-prov", title: "Personal Support Worker", location: "Toronto, ON", postedAt: posted(10) },
      { ...base, externalId: "f-remote", title: "Personal Support Worker", location: "Remote, Canada", postedAt: posted(10) },
      { ...base, externalId: "f-skill", title: "Care aide", location: "Calgary, AB", description: "Hoyer lift and dementia care.", postedAt: posted(10) },
      { ...base, externalId: "f-none", title: "Software Engineer", location: "Brampton, ON", postedAt: posted(1) },
      { ...base, externalId: "f-hidden", title: "Personal Support Worker", location: "Brampton, ON", hidden: true },
      { ...base, externalId: "f-expired", title: "Personal Support Worker", location: "Brampton, ON", expiresAt: posted(1) },
      { ...base, externalId: "f-us", title: "Personal Support Worker", location: "Austin, TX" },
    ]);

    const res = await forMe(request(app).get("/api/jobs/for-me"));

    expect(res.status).toBe(200);
    expect(res.body.jobs.map((job) => job.externalId)).toEqual(["f-city", "f-prov", "f-remote", "f-skill"]);
    expect(res.body.jobs[0].reasons).toEqual(["Title match: Personal support worker", "Matches: CPR", "Brampton"]);
    expect(res.body.jobs[1].reasons).toContain("Ontario");
    expect(res.body.jobs[3].reasons).toEqual(["Matches: Dementia care, Hoyer lift"]);
    expect(res.body.jobs[0].score).toBeGreaterThan(res.body.jobs[1].score);
  });
});
