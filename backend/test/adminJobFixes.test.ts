import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

// Review fixes for the phase 1 admin job routes: an atomic salary check,
// manual descriptions that keep their line breaks, and date-only expiry dates.

type JobJson = { _id: string; salaryMin: number | null; salaryMax: number | null; description: string; expiresAt: string | null };

let app: Express;
let Job: (typeof import("../src/modules/jobs/model.js"))["Job"];
let htmlToText: (typeof import("../src/modules/jobs/sources/common.js"))["htmlToText"];

const ADMIN = "token-fix-admin";

beforeAll(async () => {
  await startMongo();
  app = await loadApp();
  const { config } = await import("../src/lib/config.js");
  config.ADMIN_EMAILS = "fixer@example.com";
  ({ Job } = await import("../src/modules/jobs/model.js"));
  ({ htmlToText } = await import("../src/modules/jobs/sources/common.js"));
  testUsers.set(ADMIN, { uid: "uid-fixer", email: "fixer@example.com", email_verified: true });
});

beforeEach(async () => {
  await Job.deleteMany({});
  vi.restoreAllMocks();
});

afterAll(async () => {
  testUsers.clear();
  await stopMongo();
});

const as = (req: request.Test) => req.set("Authorization", `Bearer ${ADMIN}`);
const jobOf = (res: request.Response) => (res.body as { job: JobJson }).job;

const createJob = (body: Record<string, unknown> = {}) =>
  as(request(app).post("/api/admin/jobs")).send({
    title: "Personal Support Worker",
    company: "Maple Care",
    location: "Brampton, ON",
    salaryMin: 40000,
    salaryMax: 52000,
    description: "Help clients at home.",
    url: "https://maplecare.example/jobs/1",
    ...body,
  });

describe("salary bound is checked in the same write", () => {
  test("a max lowered by another write between check and save is not crossed", async () => {
    const created = jobOf(await createJob());
    const original = Job.findOneAndUpdate.bind(Job) as (...args: unknown[]) => unknown;

    // Another admin lowers the max after this request has read the job.
    vi.spyOn(Job, "findOneAndUpdate").mockImplementationOnce(((...args: unknown[]) =>
      Job.updateOne({ _id: created._id }, { $set: { salaryMax: 45000 } }).then(() => original(...args))) as never);

    const res = await as(request(app).patch(`/api/admin/jobs/${created._id}`)).send({ salaryMin: 50000 });

    expect(res.status).toBe(400);
    expect((res.body as { code?: string }).code).toBe("VALIDATION_ERROR");
    const stored = await Job.findById(created._id).lean();
    expect(stored).toMatchObject({ salaryMin: 40000, salaryMax: 45000 });
  });

  test("valid one-sided changes and clearing still work", async () => {
    const created = jobOf(await createJob());
    const patch = (body: Record<string, unknown>) => as(request(app).patch(`/api/admin/jobs/${created._id}`)).send(body);

    expect(jobOf(await patch({ salaryMin: 52000 }))).toMatchObject({ salaryMin: 52000, salaryMax: 52000 });
    expect((await patch({ salaryMax: 51999 })).status).toBe(400);
    expect(jobOf(await patch({ salaryMax: null }))).toMatchObject({ salaryMin: 52000, salaryMax: null });
    expect(jobOf(await patch({ salaryMax: 60000 }))).toMatchObject({ salaryMax: 60000 });
    expect(jobOf(await patch({ salaryMin: null }))).toMatchObject({ salaryMin: null });
  });

  test("an unknown id with one salary sent is still 404", async () => {
    const res = await as(request(app).patch("/api/admin/jobs/6566f0f0f0f0f0f0f0f0f0f0")).send({ salaryMin: 1 });
    expect(res.status).toBe(404);
  });
});

describe("descriptions", () => {
  test("a manual job keeps its line breaks, at most 2 in a row", async () => {
    const res = await createJob({ description: "Duties:  \r\n  Help clients\n\n\n\n\nCook   meals  \n" });

    expect(res.status).toBe(201);
    expect(jobOf(res).description).toBe("Duties:\nHelp clients\n\nCook meals");
  });

  test("HTML blocks in a manual job become line breaks", async () => {
    const res = await createJob({ description: "<p>Duties</p><ul><li>Help</li><li>Cook</li></ul>Thanks<br>Team" });

    expect(jobOf(res).description).toBe("Duties\n\nHelp\nCook\n\nThanks\nTeam");
  });

  test("escaped tags are removed, not turned into real tags", async () => {
    const res = await createJob({ description: "Hi &amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt; there" });

    expect(jobOf(res).description).toBe("Hi alert(1) there");
    expect(htmlToText("&lt;script&gt;x&lt;/script&gt;ok")).toBe("x ok");
    expect(htmlToText("Need &lt;5 years, pay &gt;$80k")).toBe("Need <5 years, pay >$80k");
    expect(htmlToText("Need &lt;5 years, pay &gt;$80k", 500, { keepLines: true })).toBe("Need <5 years, pay >$80k");
    const started = performance.now();
    htmlToText("<".repeat(100_000));
    htmlToText("<".repeat(100_000), 500, { keepLines: true });
    expect(performance.now() - started).toBeLessThan(200);
    expect(htmlToText("&amp;lt;b&amp;gt;bold&amp;lt;/b&amp;gt;")).toBe("bold");
    expect(htmlToText("Fish &amp;amp; chips")).toBe("Fish & chips");
    expect(htmlToText("&amp;lt;p&amp;gt;Hello&amp;lt;/p&amp;gt;")).toBe("Hello");
  });

  test("collected jobs still collapse all whitespace", () => {
    expect(htmlToText("<p>Line one</p>\n<p>Line  two</p>")).toBe("Line one Line two");
    expect(htmlToText("a\n\n\nb")).toBe("a b");
    expect(htmlToText("x".repeat(10), 4)).toBe("xxxx…");
  });
});

describe("date-only expiry dates", () => {
  test("mean the end of that day in Toronto (EST and EDT)", async () => {
    const winter = await createJob({ expiresAt: "2026-12-01" });
    const summer = await createJob({ expiresAt: "2027-07-01" });

    expect(winter.status).toBe(201);
    expect(jobOf(winter).expiresAt).toBe("2026-12-02T04:59:59.000Z");
    expect(jobOf(summer).expiresAt).toBe("2027-07-02T03:59:59.000Z");
  });

  test("today in Toronto is accepted; a bad day is rejected", async () => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date());

    expect((await createJob({ expiresAt: today })).status).toBe(201);
    expect((await createJob({ expiresAt: "2027-02-30" })).status).toBe(400);
  });

  test("PATCH reads date-only values the same way", async () => {
    const created = jobOf(await createJob());
    const res = await as(request(app).patch(`/api/admin/jobs/${created._id}`)).send({ expiresAt: "2026-12-01" });

    expect(jobOf(res).expiresAt).toBe("2026-12-02T04:59:59.000Z");
  });
});
