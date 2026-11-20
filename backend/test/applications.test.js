import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

// /api/applications: owner-only CRUD, idempotent save per job. In-memory MongoDB.
let app;
let mongoose;
let counter = 0;

beforeAll(async () => {
  mongoose = await startMongo();
  app = await loadApp();
  await mongoose.model("Application").syncIndexes();
});

afterAll(async () => {
  testUsers.clear();
  await stopMongo();
});

async function signedInUser() {
  counter += 1;
  const uid = `uid-app-${counter}`;
  const email = `app${counter}@example.com`;
  const token = `token-app-${counter}`;
  testUsers.set(token, { uid, email, email_verified: true });
  const user = await mongoose.model("User").create({ firebaseUid: uid, email });
  return { token, user };
}

const as = (token, req) => req.set("Authorization", `Bearer ${token}`);

async function cachedJob() {
  return mongoose.model("Job").create({
    externalId: `ext-${Date.now()}-${Math.random()}`,
    source: "adzuna",
    title: "Backend Engineer",
    company: "Globex",
    location: "Pune",
    url: "https://example.com/job",
  });
}

describe("applications", () => {
  test("needs sign-in", async () => {
    const res = await request(app).get("/api/applications");
    expect(res.status).toBe(401);
  });

  test("manual create, list, update, status, delete", async () => {
    const { token } = await signedInUser();

    const created = await as(token, request(app).post("/api/applications")).send({
      company: "Initech",
      role: "Frontend Developer",
      url: "https://initech.example/jobs/1",
    });
    expect(created.status).toBe(201);
    expect(created.body.application).toMatchObject({
      company: "Initech",
      role: "Frontend Developer",
      status: "Saved",
      appliedAt: null,
    });
    const id = created.body.application._id;

    const list = await as(token, request(app).get("/api/applications"));
    expect(list.status).toBe(200);
    expect(list.body.applications).toHaveLength(1);

    const updated = await as(token, request(app).patch(`/api/applications/${id}`)).send({
      notes: "Call recruiter",
    });
    expect(updated.status).toBe(200);
    expect(updated.body.application.notes).toBe("Call recruiter");

    const moved = await as(token, request(app).patch(`/api/applications/${id}/status`)).send({
      status: "Applied",
    });
    expect(moved.status).toBe(200);
    expect(moved.body.application.status).toBe("Applied");
    expect(moved.body.application.appliedAt).toBeTruthy();

    const removed = await as(token, request(app).delete(`/api/applications/${id}`));
    expect(removed.status).toBe(200);
    expect(await mongoose.model("Application").countDocuments({ _id: id })).toBe(0);
  });

  test("saving the same job twice returns the first application", async () => {
    const { token } = await signedInUser();
    const job = await cachedJob();

    const first = await as(token, request(app).post("/api/applications")).send({ jobId: String(job._id) });
    const second = await as(token, request(app).post("/api/applications")).send({ jobId: String(job._id) });

    expect(first.status).toBe(201);
    expect(first.body.application).toMatchObject({ company: "Globex", role: "Backend Engineer" });
    expect(second.status).toBe(200);
    expect(second.body.created).toBe(false);
    expect(second.body.application._id).toBe(first.body.application._id);
    expect(await mongoose.model("Application").countDocuments({ jobId: job._id })).toBe(1);
  });

  test("an unknown jobId gives 404", async () => {
    const { token } = await signedInUser();
    const res = await as(token, request(app).post("/api/applications")).send({
      jobId: String(new mongoose.Types.ObjectId()),
    });
    expect(res.status).toBe(404);
  });

  test("validation: missing fields, bad status, bad url", async () => {
    const { token } = await signedInUser();

    const empty = await as(token, request(app).post("/api/applications")).send({});
    const badUrl = await as(token, request(app).post("/api/applications")).send({
      company: "A",
      role: "B",
      url: "javascript:alert(1)",
    });
    const created = await as(token, request(app).post("/api/applications")).send({ company: "A", role: "B" });
    const badStatus = await as(
      token,
      request(app).patch(`/api/applications/${created.body.application._id}/status`)
    ).send({ status: "Ghosted" });
    const nothing = await as(
      token,
      request(app).patch(`/api/applications/${created.body.application._id}`)
    ).send({});

    expect(empty.status).toBe(400);
    expect(badUrl.status).toBe(400);
    expect(badStatus.status).toBe(400);
    expect(nothing.status).toBe(400);
  });

  test("user B cannot read, edit or delete user A's application", async () => {
    const a = await signedInUser();
    const b = await signedInUser();

    const created = await as(a.token, request(app).post("/api/applications")).send({
      company: "Umbrella",
      role: "QA",
    });
    const id = created.body.application._id;

    const list = await as(b.token, request(app).get("/api/applications"));
    const edit = await as(b.token, request(app).patch(`/api/applications/${id}`)).send({ notes: "x" });
    const status = await as(b.token, request(app).patch(`/api/applications/${id}/status`)).send({
      status: "Offer",
    });
    const del = await as(b.token, request(app).delete(`/api/applications/${id}`));

    expect(list.body.applications).toEqual([]);
    expect(edit.status).toBe(404);
    expect(status.status).toBe(404);
    expect(del.status).toBe(404);

    const stored = await mongoose.model("Application").findById(id);
    expect(stored.status).toBe("Saved");
    expect(stored.notes).toBe("");
  });
});
