import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

// /api/jobs with Adzuna keys set. fetch is stubbed: no real Adzuna calls.
// Config is read once on load, so the keys go into process.env first.
process.env.ADZUNA_APP_ID = "test-app-id";
process.env.ADZUNA_APP_KEY = "test-secret-key";
process.env.ADZUNA_COUNTRY = "IN";

let app;
let mongoose;
const token = "token-jobs";

beforeAll(async () => {
  mongoose = await startMongo();
  app = await loadApp();
  testUsers.set(token, { uid: "uid-jobs", email: "jobs@example.com", email_verified: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

afterAll(async () => {
  testUsers.clear();
  await stopMongo();
});

const as = (req) => req.set("Authorization", `Bearer ${token}`);

const adzunaResult = (id, extra = {}) => ({
  id,
  title: `<strong>React</strong> Developer ${id}`,
  company: { display_name: "Acme Ltd" },
  location: { display_name: "Bengaluru, Karnataka" },
  contract_time: "full_time",
  contract_type: "permanent",
  category: { label: "IT Jobs" },
  salary_min: 600000,
  salary_max: 900000,
  description: "Build <b>React</b> apps.",
  redirect_url: `https://www.adzuna.in/details/${id}`,
  created: "2026-11-01T10:00:00Z",
  ...extra,
});

function stubFetch(body, init = { status: 200 }) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), init));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("GET /api/jobs", () => {
  test("needs sign-in", async () => {
    const res = await request(app).get("/api/jobs");
    expect(res.status).toBe(401);
  });

  test("maps Adzuna results and caches the search for repeat calls", async () => {
    const fetchMock = stubFetch({ count: 2, results: [adzunaResult("a1"), adzunaResult("a2")] });

    const res = await as(request(app).get("/api/jobs?query=react&location=bengaluru&limit=10"));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cached).toBe(false);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.jobs).toHaveLength(2);
    expect(res.body.jobs[0]).toMatchObject({
      externalId: "a1",
      source: "adzuna",
      title: "React Developer a1",
      company: "Acme Ltd",
      location: "Bengaluru, Karnataka",
      type: "Full-time",
      salaryMin: 600000,
      salaryMax: 900000,
      description: "Build React apps.",
      url: "https://www.adzuna.in/details/a1",
      tags: ["IT Jobs", "Permanent"],
    });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.pathname).toBe("/v1/api/jobs/in/search/1");
    expect(url.searchParams.get("what")).toBe("react");
    expect(url.searchParams.get("where")).toBe("bengaluru");
    expect(url.searchParams.get("results_per_page")).toBe("10");

    const again = await as(request(app).get("/api/jobs?query=React&location=Bengaluru&limit=10"));
    expect(again.status).toBe(200);
    expect(again.body.cached).toBe(true);
    expect(again.body.jobs.map((j) => j.externalId)).toEqual(["a1", "a2"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("upserts jobs instead of duplicating them", async () => {
    stubFetch({ count: 1, results: [adzunaResult("a1", { title: "Senior React Developer" })] });

    const res = await as(request(app).get("/api/jobs?query=senior"));

    expect(res.status).toBe(200);
    const Job = mongoose.model("Job");
    expect(await Job.countDocuments({ externalId: "a1" })).toBe(1);
    expect((await Job.findOne({ externalId: "a1" })).title).toBe("Senior React Developer");
  });

  test("rejects bad paging", async () => {
    const res = await as(request(app).get("/api/jobs?limit=500"));
    expect(res.status).toBe(400);
  });

  test("Adzuna failure gives 502 without leaking the key", async () => {
    stubFetch({ error: "bad" }, { status: 500 });

    const res = await as(request(app).get("/api/jobs?query=failing"));

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain("test-secret-key");
  });

  test("Adzuna timeout gives 504", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new DOMException("The operation timed out.", "TimeoutError");
      })
    );

    const res = await as(request(app).get("/api/jobs?query=slow"));

    expect(res.status).toBe(504);
  });
});

describe("GET /api/jobs/:id", () => {
  test("returns a cached job", async () => {
    const job = await mongoose.model("Job").findOne({ externalId: "a2" });

    const res = await as(request(app).get(`/api/jobs/${job._id}`));

    expect(res.status).toBe(200);
    expect(res.body.job.externalId).toBe("a2");
  });

  test("unknown or invalid ids give 404", async () => {
    const missing = await as(request(app).get(`/api/jobs/${new mongoose.Types.ObjectId()}`));
    const invalid = await as(request(app).get("/api/jobs/not-an-id"));

    expect(missing.status).toBe(404);
    expect(invalid.status).toBe(404);
  });
});
