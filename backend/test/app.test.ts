import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { loadApp } from "./helpers/app";
import { startMongo, stopMongo } from "./helpers/mongo";
import { parseEnv } from "../src/lib/config";

// New B1 behaviour: request ids, error body shape, health/readiness, env checks.
let app: Express;

beforeAll(async () => {
  app = await loadApp();
});

describe("request id", () => {
  test("echoes a safe incoming X-Request-Id", async () => {
    const res = await request(app).get("/api/health").set("X-Request-Id", "abc-123");

    expect(res.headers["x-request-id"]).toBe("abc-123");
  });

  test("generates a UUID when none (or an unsafe one) is sent", async () => {
    const none = await request(app).get("/api/health");
    const unsafe = await request(app)
      .get("/api/health")
      .set("X-Request-Id", "bad id <script>");

    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    expect(none.headers["x-request-id"]).toMatch(uuid);
    expect(unsafe.headers["x-request-id"]).toMatch(uuid);
  });

  test("error bodies carry success:false and the request id", async () => {
    const res = await request(app).get("/api/nope").set("X-Request-Id", "req-404");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: "API route not found.",
      requestId: "req-404",
    });
  });
});

describe("auth chained by hand in legacy chat route", () => {
  test("a rejected token stops at 401 (not let through)", async () => {
    const res = await request(app)
      .post("/api/chat")
      .set("Authorization", "Bearer not-a-valid-token")
      .send({ message: "hi" });

    expect(res.status).toBe(401);
    expect((res.body as { message?: string }).message).toBe("Invalid or expired authentication token.");
  });
});

describe("health without MongoDB", () => {
  test("/api/health stays 200 (liveness) and reports the db state", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "OK",
      message: "WestForce backend is healthy.",
      db: "disconnected",
    });
  });

  test("/api/health/ready is 503 when MongoDB is not connected", async () => {
    const res = await request(app).get("/api/health/ready");

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ success: false, db: "disconnected" });
  });
});

describe("health with MongoDB", () => {
  beforeAll(async () => {
    await startMongo();
  });

  afterAll(async () => {
    await stopMongo();
  });

  test("/api/health/ready is 200 once connected", async () => {
    const res = await request(app).get("/api/health/ready");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, status: "OK", db: "connected" });
  });
});

describe("env validation", () => {
  test("production without MONGODB_URI fails fast, naming the variable only", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        FIREBASE_SERVICE_ACCOUNT_JSON: "{}",
        GEMINI_API_KEY: "secret-value-should-not-appear",
      })
    ).toThrow(/MONGODB_URI/);

    try {
      parseEnv({ NODE_ENV: "production", GEMINI_API_KEY: "secret-value-should-not-appear" });
    } catch (error) {
      expect(String(error)).not.toContain("secret-value-should-not-appear");
    }
  });

  test("Stripe, Supabase, Cloudinary and Adzuna are optional", () => {
    const env = parseEnv({
      NODE_ENV: "production",
      MONGODB_URI: "mongodb://localhost/test",
      FIREBASE_SERVICE_ACCOUNT_JSON: "{}",
    });

    expect(env.PORT).toBe(5050);
    expect(env.CLIENT_URL).toBe("http://localhost:5173");
  });
});
