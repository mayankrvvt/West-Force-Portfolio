import { describe, expect, test } from "vitest";
import request from "supertest";
import { loadApp } from "./helpers/app";

const app = await loadApp();

// Last X-Forwarded-For entry is the Vercel edge IP (added by Render).
const VERCEL_IP = "198.51.100.250";

describe("security middleware", () => {
  test("helmet headers are set and X-Powered-By is removed", async () => {
    const res = await request(app).get("/api/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  test("general /api limiter: 300 requests per 15 min per IP, then 429", async () => {
    const ip = "203.0.113.77";

    for (let i = 0; i < 300; i += 1) {
      const res = await request(app)
        .get("/api/users/me")
        .set("X-Forwarded-For", ip);
      expect(res.status).toBe(401);
    }

    const blocked = await request(app)
      .get("/api/users/me")
      .set("X-Forwarded-For", ip);
    expect(blocked.status).toBe(429);

    const spoofed = await request(app)
      .get("/api/users/me")
      .set("X-Forwarded-For", `10.1.2.3, ${ip}, ${VERCEL_IP}`);
    expect(spoofed.status).toBe(429);
  });

  test("health check and Stripe webhook are not rate limited", async () => {
    const ip = "203.0.113.78";

    for (let i = 0; i < 300; i += 1) {
      await request(app).get("/api/users/me").set("X-Forwarded-For", ip);
    }

    const health = await request(app)
      .get("/api/health")
      .set("X-Forwarded-For", ip);
    expect(health.status).toBe(200);

    const webhook = await request(app)
      .post("/api/payments/webhook")
      .set("X-Forwarded-For", ip)
      .set("Content-Type", "application/json")
      .send("{}");
    expect(webhook.status).not.toBe(429);
  });
});
