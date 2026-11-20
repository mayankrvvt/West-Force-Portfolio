import { afterAll, beforeAll, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp, testUsers } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";

// Without Adzuna keys, job search answers 503 JOBS_NOT_CONFIGURED and never calls out.
delete process.env.ADZUNA_APP_ID;
delete process.env.ADZUNA_APP_KEY;

let app;
const token = "token-jobs-off";

beforeAll(async () => {
  await startMongo();
  app = await loadApp();
  testUsers.set(token, { uid: "uid-jobs-off", email: "off@example.com", email_verified: true });
});

afterAll(async () => {
  vi.unstubAllGlobals();
  testUsers.clear();
  await stopMongo();
});

test("GET /api/jobs gives 503 JOBS_NOT_CONFIGURED", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);

  const res = await request(app).get("/api/jobs?query=react").set("Authorization", `Bearer ${token}`);

  expect(res.status).toBe(503);
  expect(res.body).toMatchObject({ success: false, code: "JOBS_NOT_CONFIGURED" });
  expect(fetchMock).not.toHaveBeenCalled();
});
