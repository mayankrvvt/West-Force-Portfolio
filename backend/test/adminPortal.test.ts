import type { Express } from "express";
import type mongooseType from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

// Admin portal phase 2: admins kept in the database (env ADMIN_EMAILS are
// owners), site settings with server side switches, and the activity log.
// In-memory MongoDB, fake Firebase.

type ErrorBody = { success: false; message: string; code?: string };
type AdminJson = { email: string; owner: boolean; addedBy: string | null; createdAt: string | null };
type ActivityJson = { actorEmail: string; action: string; target: string; details: Record<string, unknown>; at: string };

let app: Express;
let mongoose: typeof mongooseType;
let config: (typeof import("../src/lib/config.js"))["config"];
let AdminUser: (typeof import("../src/modules/admin/admins.model.js"))["AdminUser"];
let AdminActivity: (typeof import("../src/modules/admin/activity.model.js"))["AdminActivity"];
let SiteSettings: (typeof import("../src/modules/site/model.js"))["SiteSettings"];
let clearAdminCache: (typeof import("../src/modules/admin/admins.service.js"))["clearAdminCache"];
let clearSiteSettingsCache: (typeof import("../src/modules/site/service.js"))["clearSiteSettingsCache"];

const OWNER = "token-owner";
const OWNER_2 = "token-owner-2";
const HELPER = "token-helper";
const HELPER_UNVERIFIED = "token-helper-unverified";
const USER = "token-user";
const NEWBIE = "token-newbie";
const NEW_ADMIN = "token-new-admin";
const SETTINGS_ADMIN = "token-settings-admin";
const OWNERS = "Owner@Example.com, boss@example.com";

beforeAll(async () => {
  mongoose = await startMongo();
  app = await loadApp();
  ({ config } = await import("../src/lib/config.js"));
  config.ADMIN_EMAILS = OWNERS;
  ({ AdminUser } = await import("../src/modules/admin/admins.model.js"));
  ({ AdminActivity } = await import("../src/modules/admin/activity.model.js"));
  ({ SiteSettings } = await import("../src/modules/site/model.js"));
  ({ clearAdminCache } = await import("../src/modules/admin/admins.service.js"));
  ({ clearSiteSettingsCache } = await import("../src/modules/site/service.js"));
  await AdminUser.syncIndexes();
  await AdminActivity.syncIndexes();

  testUsers.set(OWNER, { uid: "uid-owner", email: "owner@example.com", email_verified: true });
  testUsers.set(OWNER_2, { uid: "uid-owner-2", email: "BOSS@example.com", email_verified: true });
  testUsers.set(HELPER, { uid: "uid-helper", email: "helper@example.com", email_verified: true });
  testUsers.set(HELPER_UNVERIFIED, { uid: "uid-helper-x", email: "helper@example.com", email_verified: false });
  testUsers.set(USER, { uid: "uid-user", email: "user@example.com", email_verified: true });
  testUsers.set(NEWBIE, { uid: "uid-newbie", email: "newbie@example.com", email_verified: true });
  testUsers.set(NEW_ADMIN, { uid: "uid-new-admin", email: "new@example.com", email_verified: true });
  testUsers.set(SETTINGS_ADMIN, { uid: "uid-settings", email: "settings@example.com", email_verified: true });
  await mongoose.model("User").create({ firebaseUid: "uid-user", email: "user@example.com" });
});

beforeEach(async () => {
  await AdminUser.deleteMany({});
  await AdminUser.create([
    { email: "helper@example.com", addedBy: "owner@example.com" },
    { email: "settings@example.com", addedBy: "owner@example.com" },
  ]);
  await SiteSettings.deleteMany({});
  await AdminActivity.deleteMany({});
  clearAdminCache();
  clearSiteSettingsCache();
});

afterAll(async () => {
  testUsers.clear();
  await stopMongo();
});

const as = (token: string, req: request.Test) => req.set("Authorization", `Bearer ${token}`);
const errorOf = (res: request.Response) => res.body as ErrorBody;
const adminsOf = (res: request.Response) => (res.body as { admins: AdminJson[] }).admins;
const patchSettings = (body: unknown, token = SETTINGS_ADMIN) =>
  as(token, request(app).patch("/api/admin/settings")).send(body as object);

describe("admins in the database", () => {
  test("GET /me gives isAdmin and isOwner", async () => {
    const me = async (token: string) => (await as(token, request(app).get("/api/admin/me"))).body as unknown;

    expect(await me(OWNER)).toEqual({ success: true, isAdmin: true, isOwner: true });
    expect(await me(OWNER_2)).toEqual({ success: true, isAdmin: true, isOwner: true });
    expect(await me(HELPER)).toEqual({ success: true, isAdmin: true, isOwner: false });
    expect(await me(HELPER_UNVERIFIED)).toEqual({
      success: true,
      isAdmin: false,
      isOwner: false,
      needsVerification: true,
    });
    expect(await me(USER)).toEqual({ success: true, isAdmin: false, isOwner: false });
  });

  test("a database admin can use the admin job routes", async () => {
    expect((await as(HELPER, request(app).get("/api/admin/jobs"))).status).toBe(200);
    expect((await as(USER, request(app).get("/api/admin/jobs"))).status).toBe(403);
  });

  test("GET /admins lists owners first, then database admins; any admin can read it", async () => {
    const res = await as(HELPER, request(app).get("/api/admin/admins"));

    expect(res.status).toBe(200);
    const admins = adminsOf(res);
    expect(admins.map((admin) => [admin.email, admin.owner])).toEqual([
      ["owner@example.com", true],
      ["boss@example.com", true],
      ["helper@example.com", false],
      ["settings@example.com", false],
    ]);
    expect(admins[0]).toEqual({ email: "owner@example.com", owner: true, addedBy: null, createdAt: null });
    expect(admins[2]).toMatchObject({ addedBy: "owner@example.com", createdAt: expect.any(String) as unknown });
    expect((await as(USER, request(app).get("/api/admin/admins"))).status).toBe(403);
  });

  test("an owner adds an admin, who gets in at once, and it is logged", async () => {
    expect((await as(NEW_ADMIN, request(app).get("/api/admin/jobs"))).status).toBe(403);

    const res = await as(OWNER, request(app).post("/api/admin/admins")).send({ email: "  New@Example.com " });

    expect(res.status).toBe(201);
    expect((res.body as { admin: AdminJson }).admin).toMatchObject({
      email: "new@example.com",
      owner: false,
      addedBy: "owner@example.com",
    });
    expect((await as(NEW_ADMIN, request(app).get("/api/admin/jobs"))).status).toBe(200);
    const log = await AdminActivity.findOne({ action: "admin.add" }).lean();
    expect(log).toMatchObject({ actorEmail: "owner@example.com", target: "new@example.com" });
  });

  test("adding an owner or an existing admin gives 409", async () => {
    const owner = await as(OWNER, request(app).post("/api/admin/admins")).send({ email: "BOSS@example.com" });
    const existing = await as(OWNER, request(app).post("/api/admin/admins")).send({ email: "helper@example.com" });

    expect(owner.status).toBe(409);
    expect(existing.status).toBe(409);
    expect(await AdminUser.countDocuments()).toBe(2);
  });

  test("a bad email or an unknown field gives 400", async () => {
    for (const body of [{ email: "not-an-email" }, {}, { email: "a@b.co", role: "owner" }, { email: 5 }]) {
      const res = await as(OWNER, request(app).post("/api/admin/admins")).send(body);
      expect(res.status).toBe(400);
      expect(errorOf(res).code).toBe("VALIDATION_ERROR");
    }
  });

  test("only owners can add or remove admins", async () => {
    const add = await as(HELPER, request(app).post("/api/admin/admins")).send({ email: "x@example.com" });
    const remove = await as(HELPER, request(app).delete("/api/admin/admins/settings@example.com"));
    const user = await as(USER, request(app).post("/api/admin/admins")).send({ email: "x@example.com" });

    expect(add.status).toBe(403);
    expect(errorOf(add).message).toBe("Only owners can change admins.");
    expect(remove.status).toBe(403);
    expect(errorOf(remove).message).toBe("Only owners can change admins.");
    expect(user.status).toBe(403);
    expect(await AdminUser.countDocuments()).toBe(2);
  });

  test("an owner removes an admin, who loses access at once, and it is logged", async () => {
    expect((await as(HELPER, request(app).get("/api/admin/jobs"))).status).toBe(200);

    const res = await as(OWNER_2, request(app).delete("/api/admin/admins/Helper%40example.com"));

    expect(res.status).toBe(200);
    expect((await as(HELPER, request(app).get("/api/admin/jobs"))).status).toBe(403);
    const log = await AdminActivity.findOne({ action: "admin.remove" }).lean();
    expect(log).toMatchObject({ actorEmail: "boss@example.com", target: "helper@example.com" });
  });

  test("removing an owner gives 400, an unknown admin 404, a bad email 400", async () => {
    const owner = await as(OWNER, request(app).delete("/api/admin/admins/boss@example.com"));
    const unknown = await as(OWNER, request(app).delete("/api/admin/admins/nobody@example.com"));
    const bad = await as(OWNER, request(app).delete("/api/admin/admins/nope"));

    expect(owner.status).toBe(400);
    expect(unknown.status).toBe(404);
    expect(bad.status).toBe(400);
  });
});

describe("site settings", () => {
  const defaults = {
    maintenance: { on: false, message: "" },
    banner: { on: false, text: "", tone: "info" },
    features: { signups: true, payments: true, ai: true, jobs: true },
  };

  test("a missing document means the defaults, with no sign in needed", async () => {
    const res = await request(app).get("/api/site/status");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, ...defaults });
  });

  test("GET /api/admin/settings is for admins only", async () => {
    const admin = await as(HELPER, request(app).get("/api/admin/settings"));
    const user = await as(USER, request(app).get("/api/admin/settings"));

    expect(admin.status).toBe(200);
    expect((admin.body as { settings: unknown }).settings).toMatchObject(defaults);
    expect(user.status).toBe(403);
  });

  test("PATCH sets only the fields sent and records who changed them", async () => {
    const first = await patchSettings({ banner: { on: true, tone: "warning" } });
    const second = await patchSettings({ banner: { text: "  Planned work on Sunday.  " } });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((second.body as { settings: unknown }).settings).toMatchObject({
      ...defaults,
      banner: { on: true, text: "Planned work on Sunday.", tone: "warning" },
      updatedBy: "settings@example.com",
      updatedAt: expect.any(String) as unknown,
    });
    const status = await request(app).get("/api/site/status");
    expect((status.body as { banner: unknown }).banner).toEqual({ on: true, text: "Planned work on Sunday.", tone: "warning" });
    const log = await AdminActivity.find({ action: "settings.update" }).lean();
    expect(log).toHaveLength(2);
    expect(log[1]?.details).toMatchObject({ changes: { "banner.text": "Planned work on Sunday." } });
  });

  test.each([
    ["an empty body", {}],
    ["an unknown top field", { theme: "dark" }],
    ["an unknown nested field", { features: { chat: false } }],
    ["a long maintenance message", { maintenance: { message: "a".repeat(301) } }],
    ["a long banner", { banner: { text: "a".repeat(201) } }],
    ["a bad tone", { banner: { tone: "danger" } }],
    ["a string for a switch", { features: { ai: "false" } }],
  ])("PATCH rejects %s with 400", async (_label, body) => {
    const res = await patchSettings(body);

    expect(res.status).toBe(400);
    expect(errorOf(res).code).toBe("VALIDATION_ERROR");
    expect(await SiteSettings.countDocuments()).toBe(0);
  });

  test("a user cannot PATCH settings", async () => {
    const res = await patchSettings({ features: { ai: false } }, USER);
    expect(res.status).toBe(403);
  });

  test("settings are cached and the cache is cleared on PATCH", async () => {
    await request(app).get("/api/site/status");
    await SiteSettings.create({ _id: "site", banner: { on: true, text: "Direct", tone: "info" } });

    const cached = await request(app).get("/api/site/status");
    expect((cached.body as { banner: { on: boolean } }).banner.on).toBe(false);

    await patchSettings({ features: { jobs: true } });
    const fresh = await request(app).get("/api/site/status");
    expect((fresh.body as { banner: unknown }).banner).toEqual({ on: true, text: "Direct", tone: "info" });
  });
});

describe("maintenance mode", () => {
  beforeEach(async () => {
    const res = await patchSettings({ maintenance: { on: true, message: "Back at 9 pm." } });
    expect(res.status).toBe(200);
  });

  test("blocks /api for users and guests with 503 MAINTENANCE", async () => {
    for (const req of [
      as(USER, request(app).get("/api/jobs")),
      request(app).get("/api/portfolios/some-slug"),
      as(USER, request(app).get("/API/Jobs")),
      as("token-bad", request(app).get("/api/jobs")),
    ]) {
      const res = await req;
      expect(res.status).toBe(503);
      expect(res.body).toMatchObject({ success: false, code: "MAINTENANCE", message: "Back at 9 pm." });
    }
  });

  test("an empty message gets a default one", async () => {
    await patchSettings({ maintenance: { message: "" } });
    const res = await as(USER, request(app).get("/api/jobs"));
    expect(res.status).toBe(503);
    expect(errorOf(res).message.length).toBeGreaterThan(0);
  });

  test("health, site status, admin routes, the webhook and admins still work", async () => {
    expect((await request(app).get("/api/health")).status).toBe(200);
    const status = await request(app).get("/api/site/status");
    expect(status.status).toBe(200);
    expect((status.body as { maintenance: unknown }).maintenance).toEqual({ on: true, message: "Back at 9 pm." });
    expect((await as(USER, request(app).get("/api/admin/me"))).status).toBe(200);
    expect((await as(HELPER, request(app).get("/api/admin/settings"))).status).toBe(200);

    const webhook = await request(app).post("/api/payments/webhook").set("Content-Type", "application/json").send("{}");
    expect(webhook.text).toBe("Stripe webhook is not configured.");

    expect((await as(OWNER, request(app).get("/api/jobs"))).status).toBe(200);
    expect((await as(HELPER, request(app).get("/api/jobs"))).status).toBe(200);
    expect((await as(HELPER_UNVERIFIED, request(app).get("/api/jobs"))).status).toBe(503);
  });

  test("turning it off opens the site again", async () => {
    await patchSettings({ maintenance: { on: false } });
    expect((await as(USER, request(app).get("/api/jobs"))).status).toBe(200);
  });
});

describe("feature switches", () => {
  const featureOff = (res: request.Response) => {
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ success: false, code: "FEATURE_OFF", message: "This feature is turned off right now." });
  };

  test("signups off blocks a new user record but not existing users", async () => {
    await patchSettings({ features: { signups: false } });

    const newbie = await as(NEWBIE, request(app).post("/api/users")).send({});
    const existing = await as(USER, request(app).post("/api/users")).send({});

    expect(newbie.status).toBe(403);
    expect(errorOf(newbie).code).toBe("SIGNUPS_OFF");
    expect(await mongoose.model("User").countDocuments({ firebaseUid: "uid-newbie" })).toBe(0);
    expect(existing.status).toBe(200);
    expect((await as(USER, request(app).get("/api/users/me"))).status).toBe(200);
  });

  test("payments off blocks checkout but not the webhook", async () => {
    await patchSettings({ features: { payments: false } });

    featureOff(await as(USER, request(app).post("/api/payments/checkout")).send({ plan: "solo" }));
    const webhook = await request(app).post("/api/payments/webhook").set("Content-Type", "application/json").send("{}");
    expect(webhook.text).toBe("Stripe webhook is not configured.");
  });

  test("ai off blocks every Gemini route", async () => {
    await patchSettings({ features: { ai: false } });

    featureOff(await request(app).post("/api/chat").send({ message: "Hi" }));
    featureOff(await as(USER, request(app).post("/api/ats/check")).send({}));
    featureOff(await as(USER, request(app).post("/api/resumes/build")).send({}));
    featureOff(await as(USER, request(app).post("/api/resumes/enhance")).send({}));
    featureOff(await as(USER, request(app).post("/api/resumes/tailor")).send({}));
    // Not AI: still answers (402 because the user has no paid plan).
    expect((await as(USER, request(app).get("/api/resumes"))).status).not.toBe(503);
  });

  test("jobs off blocks /api/jobs", async () => {
    await patchSettings({ features: { jobs: false } });

    featureOff(await as(USER, request(app).get("/api/jobs")));
    featureOff(await as(USER, request(app).get("/api/jobs/for-me")));
  });

  test("everything works again when switched back on", async () => {
    await patchSettings({ features: { jobs: false } });
    await patchSettings({ features: { jobs: true } });
    expect((await as(USER, request(app).get("/api/jobs"))).status).toBe(200);
  });
});

describe("activity log", () => {
  const job = {
    title: "Personal Support Worker",
    company: "Maple Care",
    location: "Brampton, ON",
    description: "Help clients at home.",
    url: "https://maplecare.example/jobs/1",
  };

  test("every admin write is logged; GET /activity lists newest first", async () => {
    const created = await as(HELPER, request(app).post("/api/admin/jobs")).send(job);
    const id = (created.body as { job: { _id: string } }).job._id;
    await as(HELPER, request(app).patch(`/api/admin/jobs/${id}`)).send({ title: "Senior Support Worker" });
    await as(HELPER, request(app).delete(`/api/admin/jobs/${id}`));

    const res = await as(HELPER, request(app).get("/api/admin/activity"));

    expect(res.status).toBe(200);
    const { items, total } = res.body as { items: ActivityJson[]; total: number };
    expect(total).toBe(3);
    expect(items.map((item) => item.action)).toEqual(["job.delete", "job.update", "job.create"]);
    expect(items.every((item) => item.actorEmail === "helper@example.com" && item.target === id)).toBe(true);
    expect(items[0]?.details).toMatchObject({ title: "Senior Support Worker", company: "Maple Care" });
    expect(items[1]?.details).toEqual({ fields: ["title"] });
    expect(items[2]?.details).toMatchObject({ title: "Personal Support Worker" });
    expect(typeof items[0]?.at).toBe("string");
  });

  test("50 per page, with the total", async () => {
    const start = Date.now();
    await AdminActivity.insertMany(
      Array.from({ length: 55 }, (_, i) => ({
        actorEmail: "owner@example.com",
        action: "job.create",
        target: `job-${i}`,
        at: new Date(start + i * 1000),
      }))
    );

    const page1 = (await as(HELPER, request(app).get("/api/admin/activity?page=1"))).body as { items: ActivityJson[]; total: number };
    const page2 = (await as(HELPER, request(app).get("/api/admin/activity?page=2"))).body as { items: ActivityJson[]; total: number };

    expect(page1.total).toBe(55);
    expect(page1.items).toHaveLength(50);
    expect(page1.items[0]?.target).toBe("job-54");
    expect(page2.items.map((item) => item.target)).toEqual(["job-4", "job-3", "job-2", "job-1", "job-0"]);
  });

  test("a bad page gives 400 and users get 403", async () => {
    expect((await as(HELPER, request(app).get("/api/admin/activity?page=0"))).status).toBe(400);
    expect((await as(HELPER, request(app).get("/api/admin/activity?page=abc"))).status).toBe(400);
    expect((await as(USER, request(app).get("/api/admin/activity"))).status).toBe(403);
  });

  test("entries expire after 365 days", async () => {
    const indexes = await AdminActivity.collection.indexes();
    const ttl = indexes.find((index) => index.expireAfterSeconds !== undefined);
    expect(ttl).toMatchObject({ key: { at: 1 }, expireAfterSeconds: 365 * 24 * 60 * 60 });
  });
});
