import { afterAll, beforeAll, describe, expect, test } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

// /api/resumes ownership: new saves fill userId (Firebase uid) and ownerId
// (Mongo User _id); reads match either. Fake Firebase + in-memory MongoDB.
let app;
let mongoose;
let Resume;
let userCounter = 0;

beforeAll(async () => {
  mongoose = await startMongo();
  app = await loadApp();
  Resume = mongoose.model("Resume");
});

afterAll(async () => {
  testUsers.clear();
  await stopMongo();
});

/** A signed-in, paid user with a Mongo User record. */
async function paidUser() {
  userCounter += 1;
  const uid = `uid-resume-${userCounter}`;
  const email = `resume${userCounter}@example.com`;
  const token = `token-resume-${userCounter}`;
  testUsers.set(token, { uid, email, email_verified: true });

  const user = await mongoose.model("User").create({ firebaseUid: uid, email });
  await mongoose.model("Entitlement").create({
    email,
    firebaseUid: uid,
    plan: "solo",
    purchaseId: new mongoose.Types.ObjectId(),
    grantedAt: new Date(),
  });

  return { uid, token, user };
}

const as = (token, req) => req.set("Authorization", `Bearer ${token}`);

describe("resume ownership", () => {
  test("POST / saves both userId and ownerId", async () => {
    const { uid, token, user } = await paidUser();

    const res = await as(token, request(app).post("/api/resumes")).send({
      resume: { title: "Dev Resume", name: "Jane" },
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.resume.title).toBe("Dev Resume");

    const saved = await Resume.findById(res.body.resume._id).lean();
    expect(saved.userId).toBe(uid);
    expect(String(saved.ownerId)).toBe(String(user._id));
    expect(saved.content.name).toBe("Jane");
  });

  test("GET / lists legacy (userId only) and new (ownerId) resumes, not other users'", async () => {
    const { uid, token, user } = await paidUser();
    const other = await paidUser();

    await Resume.create({ userId: uid, title: "Legacy" });
    await Resume.create({ userId: "renamed-uid", ownerId: user._id, title: "By owner" });
    await Resume.create({ userId: other.uid, ownerId: other.user._id, title: "Not mine" });

    const res = await as(token, request(app).get("/api/resumes"));

    expect(res.status).toBe(200);
    expect(res.body.resumes.map((r) => r.title).sort()).toEqual(["By owner", "Legacy"]);
  });

  test("GET /:id and DELETE /:id only work for the owner", async () => {
    const owner = await paidUser();
    const stranger = await paidUser();
    const resume = await Resume.create({ userId: owner.uid, title: "Mine" });

    const denied = await as(stranger.token, request(app).get(`/api/resumes/${resume._id}`));
    expect(denied.status).toBe(404);
    expect(denied.body.message).toBe("Resume not found.");

    const found = await as(owner.token, request(app).get(`/api/resumes/${resume._id}`));
    expect(found.status).toBe(200);
    expect(found.body.resume.title).toBe("Mine");

    const notDeleted = await as(stranger.token, request(app).delete(`/api/resumes/${resume._id}`));
    expect(notDeleted.status).toBe(404);

    const deleted = await as(owner.token, request(app).delete(`/api/resumes/${resume._id}`));
    expect(deleted.status).toBe(200);
    expect(deleted.body.message).toBe("Resume deleted successfully.");
    expect(await Resume.findById(resume._id)).toBeNull();
  });

  test("GET /:id and DELETE /:id with a malformed id -> 400, not 500", async () => {
    const { token } = await paidUser();

    const got = await as(token, request(app).get("/api/resumes/not-an-id"));
    expect(got.status).toBe(400);
    expect(got.body.success).toBe(false);
    expect(got.body.message).toBe("Invalid resume id.");

    const removed = await as(token, request(app).delete("/api/resumes/not-an-id"));
    expect(removed.status).toBe(400);
  });

  test("POST / without resume data -> 400", async () => {
    const { token } = await paidUser();

    const res = await as(token, request(app).post("/api/resumes")).send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Resume data is required.");
  });

  test("POST /build without portfolio -> 400", async () => {
    const { token } = await paidUser();

    const res = await as(token, request(app).post("/api/resumes/build")).send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Portfolio data is required.");
  });

  test("unpaid user -> 402", async () => {
    userCounter += 1;
    const token = `token-resume-unpaid-${userCounter}`;
    testUsers.set(token, { uid: `uid-unpaid-${userCounter}`, email: "unpaid@example.com" });

    const res = await as(token, request(app).get("/api/resumes"));

    expect(res.status).toBe(402);
    expect(res.body.code).toBe("PAYMENT_REQUIRED");
  });

  test("POST /extract-text reads a TXT file (no plan needed)", async () => {
    userCounter += 1;
    const token = `token-resume-ats-${userCounter}`;
    testUsers.set(token, { uid: `uid-ats-${userCounter}`, email: "ats@example.com" });

    const res = await as(token, request(app).post("/api/resumes/extract-text")).attach(
      "file",
      Buffer.from("  Jane Doe\nDeveloper  "),
      { filename: "cv.txt", contentType: "text/plain" }
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ fileName: "cv.txt", resumeText: "Jane Doe\nDeveloper" });
  });

  test("POST /extract-text with a wrong type -> 400", async () => {
    userCounter += 1;
    const token = `token-resume-ats-${userCounter}`;
    testUsers.set(token, { uid: `uid-ats-${userCounter}`, email: "ats2@example.com" });

    const res = await as(token, request(app).post("/api/resumes/extract-text")).attach(
      "file",
      Buffer.from("x"),
      { filename: "a.png", contentType: "image/png" }
    );

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Upload a PDF, DOCX, or TXT resume for ATS analysis.");
  });
});
