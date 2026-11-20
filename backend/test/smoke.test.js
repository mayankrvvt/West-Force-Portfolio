import { describe, expect, test } from "vitest";
import request from "supertest";
import { loadApp } from "./helpers/app";

const app = await loadApp();

describe("smoke", () => {
  test("GET /api/health returns 200", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  test("protected route returns 401 without a token", async () => {
    const res = await request(app).get("/api/users/me");

    expect(res.status).toBe(401);
  });

  test("protected route returns 401 with a bad token", async () => {
    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", "Bearer not-a-real-token");

    expect(res.status).toBe(401);
  });
});
