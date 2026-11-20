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

describe("health version", () => {
  const saved = { render: process.env.RENDER_GIT_COMMIT, git: process.env.GIT_COMMIT };

  afterAll(() => {
    if (saved.render === undefined) delete process.env.RENDER_GIT_COMMIT;
    else process.env.RENDER_GIT_COMMIT = saved.render;
    if (saved.git === undefined) delete process.env.GIT_COMMIT;
    else process.env.GIT_COMMIT = saved.git;
  });

  test("reports RENDER_GIT_COMMIT, then GIT_COMMIT, else unknown", async () => {
    const version = async () =>
      ((await request(app).get("/api/health")).body as { version?: string }).version;

    delete process.env.RENDER_GIT_COMMIT;
    delete process.env.GIT_COMMIT;
    expect(await version()).toBe("unknown");

    process.env.GIT_COMMIT = "abc123";
    expect(await version()).toBe("abc123");

    process.env.RENDER_GIT_COMMIT = "def456";
    expect(await version()).toBe("def456");
  });
});

describe("CORS origins", () => {
  test("localhost is allowed outside production only", async () => {
    const { corsAllowedOrigins } = await import("../src/app.js");

    expect(corsAllowedOrigins("development", "https://westforce.example")).toContain(
      "http://localhost:5173"
    );
    expect(corsAllowedOrigins("production", "https://westforce.example")).toEqual([
      "https://westforce.example",
    ]);
  });
});

const prodBase = {
  NODE_ENV: "production",
  MONGODB_URI: "mongodb://localhost/test",
  FIREBASE_SERVICE_ACCOUNT_JSON: "{}",
  INSIGHTS_HASH_SECRET: "test-insights-secret",
  CLIENT_URL: "https://westforce.example",
  DOCUMENT_ACCESS_SECRET: "test-document-secret",
};

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

  test("Stripe, Supabase, Cloudinary and Jooble are optional", () => {
    const env = parseEnv(prodBase);

    expect(env.PORT).toBe(5050);
    expect(env.CLIENT_URL).toBe("https://westforce.example");
  });

  test("CLIENT_URL defaults to localhost outside production only", () => {
    const { CLIENT_URL: _omit, ...withoutClientUrl } = prodBase;

    expect(() => parseEnv(withoutClientUrl)).toThrow(/CLIENT_URL/);
    expect(() => parseEnv({ ...withoutClientUrl, CLIENT_URL: "" })).toThrow(/CLIENT_URL/);
    expect(parseEnv({ ...withoutClientUrl, NODE_ENV: "development" }).CLIENT_URL).toBe(
      "http://localhost:5173"
    );
  });

  test("production without DOCUMENT_ACCESS_SECRET fails at startup", () => {
    const { DOCUMENT_ACCESS_SECRET: _omit, ...withoutSecret } = prodBase;

    expect(() => parseEnv(withoutSecret)).toThrow(/DOCUMENT_ACCESS_SECRET/);
    expect(() => parseEnv({ ...withoutSecret, NODE_ENV: "development" })).not.toThrow();
  });

  test("collector-only production with live mail needs SITE_URL or CLIENT_URL", () => {
    const collector = {
      NODE_ENV: "production",
      JOBS_COLLECTOR_ONLY: "true",
      MONGODB_URI: "mongodb://localhost/test",
      FIREBASE_SERVICE_ACCOUNT_JSON: "{}",
    };

    expect(() => parseEnv({ ...collector, MAIL_MODE: "live" })).toThrow(/SITE_URL/);
    expect(() => parseEnv({ ...collector, MAIL_MODE: "live", SITE_URL: "" })).toThrow(/SITE_URL/);
    expect(() => parseEnv({ ...collector, MAIL_MODE: "live", SITE_URL: "https://westforce.example" })).not.toThrow();
    expect(() => parseEnv({ ...collector, MAIL_MODE: "live", CLIENT_URL: "https://westforce.example" })).not.toThrow();
    expect(() => parseEnv(collector)).not.toThrow();
    expect(() => parseEnv({ ...collector, NODE_ENV: "development", MAIL_MODE: "live" })).not.toThrow();
  });

  test("production refuses Stripe demo mode and test keys", () => {
    expect(() => parseEnv({ ...prodBase, STRIPE_MODE: "demo" })).toThrow(/STRIPE_MODE/);
    expect(() => parseEnv({ ...prodBase, STRIPE_SECRET_KEY: "sk_test_abc" })).toThrow(
      /STRIPE_SECRET_KEY/
    );
    expect(() =>
      parseEnv({ ...prodBase, STRIPE_MODE: "live", STRIPE_SECRET_KEY: "sk_live_abc" })
    ).not.toThrow();
    expect(() =>
      parseEnv({ ...prodBase, NODE_ENV: "development", STRIPE_MODE: "demo", STRIPE_SECRET_KEY: "sk_test_abc" })
    ).not.toThrow();

    try {
      parseEnv({ ...prodBase, STRIPE_SECRET_KEY: "sk_test_secret-value-should-not-appear" });
    } catch (error) {
      expect(String(error)).not.toContain("secret-value-should-not-appear");
    }
  });

  test("production without INSIGHTS_HASH_SECRET fails at startup", () => {
    const base = {
      MONGODB_URI: "mongodb://localhost/test",
      FIREBASE_SERVICE_ACCOUNT_JSON: "{}",
      CLIENT_URL: "https://westforce.example",
      DOCUMENT_ACCESS_SECRET: "test-document-secret",
    };

    expect(() => parseEnv({ ...base, NODE_ENV: "production" })).toThrow(/INSIGHTS_HASH_SECRET/);
    expect(() => parseEnv({ ...base, NODE_ENV: "development" })).not.toThrow();
    expect(() => parseEnv({ ...base, NODE_ENV: "production", JOBS_COLLECTOR_ONLY: "true" })).not.toThrow();
  });
});
