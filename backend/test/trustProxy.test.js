import { afterEach, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp } from "./helpers/app";
import { logger } from "../src/lib/logger";
import { parseTrustProxyHops } from "../src/utils/trustProxy";

const app = await loadApp();

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.LOG_CLIENT_IP;
});

// Browser -> Vercel rewrite -> Render proxy -> app. Vercel appends the
// browser IP, Render appends Vercel's IP, so the app sees "client, vercel".
describe("trust proxy", () => {
  test("default 2 hops: X-Forwarded-For 'client, vercel' resolves req.ip to the client", async () => {
    expect(app.get("trust proxy")).toBe(2);

    process.env.LOG_CLIENT_IP = "true";
    const log = vi.spyOn(logger, "info");

    await request(app)
      .get("/api/health")
      .set("X-Forwarded-For", "203.0.113.9, 198.51.100.250");

    const line = log.mock.calls.find((call) =>
      String(call[0]).includes("[client-ip]")
    );
    expect(line).toBeDefined();
    expect(line.join(" ")).toContain("ip=203.0.113.9");
  });

  test("client IP is not logged unless LOG_CLIENT_IP=true", async () => {
    const log = vi.spyOn(logger, "info");

    await request(app)
      .get("/api/health")
      .set("X-Forwarded-For", "203.0.113.9, 198.51.100.250");

    expect(
      log.mock.calls.some((call) => String(call[0]).includes("[client-ip]"))
    ).toBe(false);
  });

  test("TRUST_PROXY_HOPS parsing: integer >= 0, else default 2", () => {
    expect(parseTrustProxyHops(undefined)).toBe(2);
    expect(parseTrustProxyHops("")).toBe(2);
    expect(parseTrustProxyHops("1")).toBe(1);
    expect(parseTrustProxyHops("3")).toBe(3);
    expect(parseTrustProxyHops("0")).toBe(0);
    expect(parseTrustProxyHops("abc")).toBe(2);
    expect(parseTrustProxyHops("-1")).toBe(2);
    expect(parseTrustProxyHops("1.5")).toBe(2);
  });
});
