import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp } from "./helpers/app";
import { stubGeminiFetch } from "./helpers/gemini.js";
import { startMongo, stopMongo } from "./helpers/mongo";

// This file tests the per-minute limit, so keep the guest daily cap out of the way.
process.env.CHAT_ANON_DAILY_PER_IP = "100";

// Daily guest caps are stored in MongoDB.
await startMongo();
const app = await loadApp();
let fetchMock;

beforeAll(() => {
  fetchMock = stubGeminiFetch();
});

afterAll(async () => {
  vi.unstubAllGlobals();
  await stopMongo();
  delete process.env.CHAT_ANON_DAILY_PER_IP;
});

// Vercel appends the real client IP, then Render appends Vercel's IP, so the
// real client is the SECOND-TO-LAST X-Forwarded-For entry. Anything before
// it is client-supplied and can be spoofed.
const VERCEL_IP = "198.51.100.250";
function chat(xff) {
  return request(app)
    .post("/api/chat")
    .set("X-Forwarded-For", xff)
    .send({ message: "Hi" });
}

describe("chat per-IP limiter", () => {
  test("spoofed X-Forwarded-For values do not reset the 15/min limit", async () => {
    for (let i = 0; i < 15; i += 1) {
      const res = await chat(`10.0.${i}.1, 203.0.113.7, ${VERCEL_IP}`);
      expect(res.status).toBe(200);
    }

    const blocked = await chat(`10.99.99.99, 203.0.113.7, ${VERCEL_IP}`);
    expect(blocked.status).toBe(429);
    expect(blocked.body.retryAfter).toBeGreaterThan(0);
  });

  test("a different real client IP is not blocked", async () => {
    const res = await chat("198.51.100.20");
    expect(res.status).toBe(200);
  });
});

describe("chat Gemini call", () => {
  test("sends the request with an abort signal (timeout)", async () => {
    fetchMock.mockClear();

    const res = await chat("198.51.100.21");

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  test("returns 504 when Gemini times out", async () => {
    // Timeouts are not retried, so one failed try is final.
    const timeout = () =>
      new DOMException("The operation was aborted due to timeout", "TimeoutError");
    fetchMock.mockRejectedValueOnce(timeout());

    const res = await chat("198.51.100.22");

    expect(res.status).toBe(504);
    expect(res.body.success).toBe(false);
  });
});
