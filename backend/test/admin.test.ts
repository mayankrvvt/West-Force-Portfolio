import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

// /api/admin: the site owner adds Canadian jobs by hand. Admin = a verified
// Firebase email listed in ADMIN_EMAILS. In-memory MongoDB, fake Firebase.

type JobJson = {
  _id: string;
  source: string;
  externalId: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string;
  tags: string[];
  url: string;
  postedAt: string | null;
  expiresAt: string | null;
  hidden: boolean;
};

type ErrorBody = { success: false; message: string; code?: string; requestId: string };

type ConfigModule = typeof import("../src/lib/config.js");

let app: Express;
let Job: (typeof import("../src/modules/jobs/model.js"))["Job"];
let config: ConfigModule["config"];
let adminEmails: ConfigModule["adminEmails"];

const DAY = 24 * 60 * 60 * 1000;
const ADMIN = "token-admin";
const ADMIN_2 = "token-admin-2";
const USER = "token-user";
const UNVERIFIED = "token-unverified";
const ADMIN_LIST = " Owner@Example.com , , second@example.com ";

beforeAll(async () => {
  const mongoose = await startMongo();
  app = await loadApp();
  ({ config, adminEmails } = await import("../src/lib/config.js"));
  config.ADMIN_EMAILS = ADMIN_LIST;
  ({ Job } = await import("../src/modules/jobs/model.js"));
  await mongoose.model("Application").syncIndexes();

  testUsers.set(ADMIN, { uid: "uid-admin", email: "OWNER@example.com", email_verified: true });
  testUsers.set(ADMIN_2, { uid: "uid-admin-2", email: "second@example.com", email_verified: true });
  testUsers.set(USER, { uid: "uid-user", email: "user@example.com", email_verified: true });
  testUsers.set(UNVERIFIED, { uid: "uid-unverified", email: "owner@example.com", email_verified: false });
  await mongoose.model("User").create({ firebaseUid: "uid-user", email: "user@example.com" });
});

beforeEach(async () => {
  await Job.deleteMany({});
});

afterAll(async () => {
  testUsers.clear();
  await stopMongo();
});

const as = (token: string, req: request.Test) => req.set("Authorization", `Bearer ${token}`);
const jobOf = (res: request.Response) => (res.body as { job: JobJson }).job;
const jobsOf = (res: request.Response) => (res.body as { jobs: JobJson[] }).jobs;
const errorOf = (res: request.Response) => res.body as ErrorBody;

const validJob = () => ({
  title: "Personal Support Worker",
  company: "Maple Care",
  location: "Brampton, ON",
  type: "Full time",
  salaryMin: 40000,
  salaryMax: 52000,
  description: "Help clients at home.",
  tags: ["care", "health"],
  url: "https://maplecare.example/jobs/1",
});

const createJob = (body: Record<string, unknown> = {}) =>
  as(ADMIN, request(app).post("/api/admin/jobs")).send({ ...validJob(), ...body });

describe("admin access", () => {
  test("no token gives 401", async () => {
    expect((await request(app).get("/api/admin/me")).status).toBe(401);
    expect((await request(app).get("/api/admin/jobs")).status).toBe(401);
    expect((await request(app).post("/api/admin/jobs").send(validJob())).status).toBe(401);
  });

  test("a signed-in user who is not an admin gets 403", async () => {
    const list = await as(USER, request(app).get("/api/admin/jobs"));
    const create = await as(USER, request(app).post("/api/admin/jobs")).send(validJob());

    expect(list.status).toBe(403);
    expect(errorOf(list)).toMatchObject({ success: false, message: "Admins only." });
    expect(create.status).toBe(403);
    expect(await Job.countDocuments()).toBe(0);
  });

  test("an admin email that is not verified gets 403", async () => {
    const res = await as(UNVERIFIED, request(app).get("/api/admin/jobs"));
    expect(res.status).toBe(403);
  });

  test("the email match ignores case and spaces", async () => {
    const res = await as(ADMIN, request(app).get("/api/admin/jobs"));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, jobs: [] });
  });

  test("an empty admin list lets nobody in", async () => {
    try {
      for (const value of ["", " , ", undefined]) {
        config.ADMIN_EMAILS = value;
        const res = await as(ADMIN, request(app).get("/api/admin/jobs"));
        expect(res.status).toBe(403);
      }
    } finally {
      config.ADMIN_EMAILS = ADMIN_LIST;
    }
  });

  test("adminEmails trims, lower cases and drops blanks", () => {
    expect([...adminEmails(ADMIN_LIST)]).toEqual(["owner@example.com", "second@example.com"]);
    expect(adminEmails("").size).toBe(0);
    expect(adminEmails(" , ").size).toBe(0);
  });

  test("GET /me says whether the caller is an admin and an owner", async () => {
    const admin = await as(ADMIN, request(app).get("/api/admin/me"));
    const user = await as(USER, request(app).get("/api/admin/me"));
    const unverified = await as(UNVERIFIED, request(app).get("/api/admin/me"));

    expect(admin.status).toBe(200);
    expect(admin.body).toEqual({ success: true, isAdmin: true, isOwner: true });
    expect(user.status).toBe(200);
    expect(user.body).toEqual({ success: true, isAdmin: false, isOwner: false });
    expect(unverified.body).toEqual({
      success: true,
      isAdmin: false,
      isOwner: false,
      needsVerification: true,
    });
  });

  test("GET /me hints needsVerification only for listed emails that are not verified", async () => {
    const { AdminUser } = await import("../src/modules/admin/admins.model.js");
    const { clearAdminCache } = await import("../src/modules/admin/admins.service.js");
    testUsers.set("token-unverified-portal", {
      uid: "uid-unverified-portal",
      email: "Portal@example.com",
      email_verified: false,
    });
    testUsers.set("token-unverified-stranger", {
      uid: "uid-unverified-stranger",
      email: "stranger@example.com",
      email_verified: false,
    });
    await AdminUser.create({ email: "portal@example.com", addedBy: "owner@example.com" });
    clearAdminCache();

    try {
      const portal = await as("token-unverified-portal", request(app).get("/api/admin/me"));
      const stranger = await as("token-unverified-stranger", request(app).get("/api/admin/me"));

      expect(portal.body).toEqual({
        success: true,
        isAdmin: false,
        isOwner: false,
        needsVerification: true,
      });
      expect(stranger.body).toEqual({ success: true, isAdmin: false, isOwner: false });
    } finally {
      await AdminUser.deleteMany({});
      clearAdminCache();
    }
  });
});

describe("POST /api/admin/jobs validation", () => {
  test.each([
    ["a location outside Canada", { location: "Austin, TX" }],
    ["an http url", { url: "http://maplecare.example/jobs/1" }],
    ["a javascript url", { url: "javascript:alert(1)" }],
    ["a source key", { source: "greenhouse" }],
    ["an externalId key", { externalId: "x1" }],
    ["a title that is too long", { title: "a".repeat(151) }],
    ["a title that is too short", { title: "ab" }],
    ["min salary above max", { salaryMin: 60000, salaryMax: 50000 }],
    ["a salary with decimals", { salaryMin: 40000.5 }],
    ["too many tags", { tags: Array.from({ length: 11 }, (_, i) => `tag${i}`) }],
    ["an expiry date in the past", { expiresAt: new Date(Date.now() - DAY).toISOString() }],
    ["a missing title", { title: undefined }],
  ])("rejects %s with 400", async (_label, body) => {
    const res = await createJob(body);

    expect(res.status).toBe(400);
    expect(errorOf(res)).toMatchObject({ success: false, code: "VALIDATION_ERROR" });
    expect(typeof errorOf(res).message).toBe("string");
    expect(await Job.countDocuments()).toBe(0);
  });
});

describe("POST /api/admin/jobs", () => {
  test("creates a manual job with a 60 day expiry by default", async () => {
    const before = Date.now();
    const res = await createJob();

    expect(res.status).toBe(201);
    const job = jobOf(res);
    expect(job).toMatchObject({ ...validJob(), source: "manual", hidden: false });
    expect(job.externalId).toMatch(/^manual-[0-9a-f-]{36}$/);
    expect(Math.abs(new Date(job.postedAt ?? 0).getTime() - before)).toBeLessThan(60_000);
    expect(Math.abs(new Date(job.expiresAt ?? 0).getTime() - (before + 60 * DAY))).toBeLessThan(60_000);
  });

  test("expiresAt null means it never expires", async () => {
    const res = await createJob({ expiresAt: null });
    expect(res.status).toBe(201);
    expect(jobOf(res).expiresAt).toBeNull();
  });

  test("accepts the end of a picked day and each job type the form sends", async () => {
    const endOfDay = new Date(Date.now() + 10 * DAY);
    endOfDay.setHours(23, 59, 59, 999);

    for (const type of ["Full time", "Part time", "Contract", "Temporary", "Casual"]) {
      const res = await createJob({ type, expiresAt: endOfDay.toISOString() });
      expect(res.status).toBe(201);
      expect(jobOf(res)).toMatchObject({ type, expiresAt: endOfDay.toISOString() });
    }
  });

  test("strips HTML from the description", async () => {
    const res = await createJob({ description: "<p>Help <b>clients</b> &amp; families</p><img src=x onerror=alert(1)>" });

    expect(res.status).toBe(201);
    expect(jobOf(res).description).toBe("Help clients & families");
  });

  test("a created job shows in the job search and by id", async () => {
    const created = jobOf(await createJob());

    const search = await as(USER, request(app).get("/api/jobs?query=support"));
    const one = await as(USER, request(app).get(`/api/jobs/${created._id}`));

    expect(jobsOf(search).map((job) => job._id)).toEqual([created._id]);
    expect(one.status).toBe(200);
    expect(jobOf(one)).toMatchObject({ _id: created._id, source: "manual" });
  });

  test("hidden and expired jobs are not listed", async () => {
    const hidden = jobOf(await createJob({ hidden: true }));
    const expired = await Job.create({
      ...validJob(),
      source: "manual",
      externalId: "manual-expired",
      postedAt: new Date(Date.now() - 90 * DAY),
      expiresAt: new Date(Date.now() - DAY),
    });

    const search = await as(USER, request(app).get("/api/jobs?query=support"));
    const hiddenOne = await as(USER, request(app).get(`/api/jobs/${hidden._id}`));
    const expiredOne = await as(USER, request(app).get(`/api/jobs/${String(expired._id)}`));

    expect(jobsOf(search)).toEqual([]);
    expect(hiddenOne.status).toBe(404);
    expect(expiredOne.status).toBe(404);
  });

  test("a user can apply to a manual job", async () => {
    const created = jobOf(await createJob());

    const res = await as(USER, request(app).post("/api/applications")).send({ jobId: created._id });

    expect(res.status).toBe(201);
    expect((res.body as { application: Record<string, unknown> }).application).toMatchObject({
      jobId: created._id,
      role: "Personal Support Worker",
      company: "Maple Care",
    });
  });
});

describe("GET /api/admin/jobs", () => {
  test("lists only manual jobs, including hidden and expired, newest first", async () => {
    await Job.create({ source: "greenhouse", externalId: "gh1", title: "Engineer", location: "Toronto, ON" });
    const first = jobOf(await createJob({ title: "First job" }));
    await Job.create({
      ...validJob(),
      title: "Expired job",
      source: "manual",
      externalId: "manual-old",
      expiresAt: new Date(Date.now() - DAY),
    });
    const hidden = jobOf(await createJob({ title: "Hidden job", hidden: true }));

    const res = await as(ADMIN, request(app).get("/api/admin/jobs"));

    expect(res.status).toBe(200);
    const titles = jobsOf(res).map((job) => job.title);
    expect(titles).toEqual(["Hidden job", "Expired job", "First job"]);
    expect(jobsOf(res).map((job) => job._id)).toContain(first._id);
    expect(jobsOf(res).map((job) => job._id)).toContain(hidden._id);
  });
});

describe("PATCH /api/admin/jobs/:id", () => {
  test("changes only the fields sent", async () => {
    const created = jobOf(await createJob());

    const res = await as(ADMIN, request(app).patch(`/api/admin/jobs/${created._id}`)).send({ title: "Senior Support Worker" });

    expect(res.status).toBe(200);
    const { title, ...rest } = jobOf(res);
    const { title: _old, ...before } = created;
    expect(title).toBe("Senior Support Worker");
    expect(rest).toMatchObject({ ...before, updatedAt: expect.any(String) as unknown });
  });

  test("can hide a job and clear its expiry", async () => {
    const created = jobOf(await createJob());

    const res = await as(ADMIN, request(app).patch(`/api/admin/jobs/${created._id}`)).send({ hidden: true, expiresAt: null });

    expect(res.status).toBe(200);
    expect(jobOf(res)).toMatchObject({ hidden: true, expiresAt: null });
  });

  test("checks min and max salary against the stored values", async () => {
    const created = jobOf(await createJob());

    const res = await as(ADMIN, request(app).patch(`/api/admin/jobs/${created._id}`)).send({ salaryMin: 60000 });

    expect(res.status).toBe(400);
    expect(errorOf(res).code).toBe("VALIDATION_ERROR");
    expect((await Job.findById(created._id).lean())?.salaryMin).toBe(40000);
  });

  test("rejects an empty body, a source key and a bad url", async () => {
    const created = jobOf(await createJob());
    const patch = (body: Record<string, unknown>) =>
      as(ADMIN, request(app).patch(`/api/admin/jobs/${created._id}`)).send(body);

    expect((await patch({})).status).toBe(400);
    expect((await patch({ source: "lever" })).status).toBe(400);
    expect((await patch({ url: "http://maplecare.example" })).status).toBe(400);
  });

  test("a greenhouse job or an unknown id gives 404, a bad id 400", async () => {
    const collected = await Job.create({ source: "greenhouse", externalId: "gh1", title: "Engineer", location: "Toronto, ON" });

    const greenhouse = await as(ADMIN, request(app).patch(`/api/admin/jobs/${String(collected._id)}`)).send({ title: "Hacked title" });
    const unknown = await as(ADMIN, request(app).patch("/api/admin/jobs/6566f0f0f0f0f0f0f0f0f0f0")).send({ title: "New title" });
    const bad = await as(ADMIN, request(app).patch("/api/admin/jobs/not-an-id")).send({ title: "New title" });

    expect(greenhouse.status).toBe(404);
    expect(errorOf(greenhouse)).toMatchObject({ success: false, message: "Job not found." });
    expect(unknown.status).toBe(404);
    expect(bad.status).toBe(400);
    expect((await Job.findById(collected._id).lean())?.title).toBe("Engineer");
  });
});

describe("DELETE /api/admin/jobs/:id", () => {
  test("deletes a manual job; applications keep their own copy", async () => {
    const created = jobOf(await createJob());
    const applied = await as(USER, request(app).post("/api/applications")).send({ jobId: created._id });
    expect(applied.status).toBe(201);

    const res = await as(ADMIN, request(app).delete(`/api/admin/jobs/${created._id}`));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: "Job deleted." });
    expect(await Job.countDocuments()).toBe(0);
    const list = await as(USER, request(app).get("/api/applications"));
    expect((list.body as { applications: Record<string, unknown>[] }).applications[0]).toMatchObject({
      role: "Personal Support Worker",
      company: "Maple Care",
    });
  });

  test("a greenhouse job gives 404 and is kept", async () => {
    const collected = await Job.create({ source: "greenhouse", externalId: "gh1", title: "Engineer", location: "Toronto, ON" });

    const res = await as(ADMIN, request(app).delete(`/api/admin/jobs/${String(collected._id)}`));

    expect(res.status).toBe(404);
    expect(await Job.countDocuments()).toBe(1);
  });

  test("a non-admin gets 403", async () => {
    const created = jobOf(await createJob());
    const res = await as(USER, request(app).delete(`/api/admin/jobs/${created._id}`));
    expect(res.status).toBe(403);
    expect(await Job.countDocuments()).toBe(1);
  });
});

describe("write limit", () => {
  test("an admin gets 429 after 60 writes in 15 minutes", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 61; i += 1) {
      const res = await as(ADMIN_2, request(app).post("/api/admin/jobs")).send({});
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 60).every((status) => status === 400)).toBe(true);
    expect(statuses[60]).toBe(429);
    // Reads are not counted by the write limit.
    expect((await as(ADMIN_2, request(app).get("/api/admin/jobs"))).status).toBe(200);
  });
});
