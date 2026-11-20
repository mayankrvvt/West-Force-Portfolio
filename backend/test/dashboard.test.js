import { afterAll, beforeAll, expect, test } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

// GET /api/dashboard/summary: counts, recent lists and recommended (cached) jobs.
let app;
let mongoose;

beforeAll(async () => {
  mongoose = await startMongo();
  app = await loadApp();
});

afterAll(async () => {
  testUsers.clear();
  await stopMongo();
});

const as = (token, req) => req.set("Authorization", `Bearer ${token}`);

test("needs sign-in", async () => {
  const res = await request(app).get("/api/dashboard/summary");
  expect(res.status).toBe(401);
});

test("a new user gets zeros and empty lists", async () => {
  testUsers.set("token-dash-new", { uid: "uid-dash-new", email: "new@example.com" });

  const res = await as("token-dash-new", request(app).get("/api/dashboard/summary"));

  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.stats).toMatchObject({ resumes: 0, applications: 0, interviews: 0, savedJobs: 0 });
  expect(res.body.recentResumes).toEqual([]);
  expect(res.body.recentApplications).toEqual([]);
  expect(Array.isArray(res.body.recommendedJobs)).toBe(true);
});

test("summary counts the user's own data and skips applied jobs", async () => {
  const uid = "uid-dash";
  testUsers.set("token-dash", { uid, email: "dash@example.com" });
  const user = await mongoose.model("User").create({ firebaseUid: uid, email: "dash@example.com" });
  const other = await mongoose.model("User").create({ firebaseUid: "uid-other", email: "o@example.com" });

  const Job = mongoose.model("Job");
  await Job.init(); // build the text index so the text-match path runs
  const applied = await Job.create({ externalId: "d1", source: "adzuna", title: "React Developer" });
  await Job.create({ externalId: "d2", source: "adzuna", title: "React Engineer" });

  const Application = mongoose.model("Application");
  await Application.create([
    { ownerId: user._id, company: "A", role: "React Developer", status: "Saved", jobId: applied._id },
    { ownerId: user._id, company: "B", role: "Dev", status: "Interview" },
    { ownerId: user._id, company: "C", role: "Dev", status: "Applied" },
    { ownerId: other._id, company: "X", role: "Dev", status: "Interview" },
  ]);
  await mongoose.model("Resume").create({
    userId: uid,
    ownerId: user._id,
    title: "Main",
    targetRole: "React Developer",
    atsScore: 72,
  });

  const res = await as("token-dash", request(app).get("/api/dashboard/summary"));

  expect(res.status).toBe(200);
  expect(res.body.stats).toEqual({
    resumes: 1,
    applications: 3,
    interviews: 1,
    savedJobs: 1,
    latestAtsScore: 72,
  });
  expect(res.body.recentResumes).toHaveLength(1);
  expect(res.body.recentResumes[0].content).toBeUndefined();
  expect(res.body.recentApplications).toHaveLength(3);
  const recommended = res.body.recommendedJobs.map((j) => j.externalId);
  expect(recommended).toContain("d2");
  expect(recommended).not.toContain("d1");
});
