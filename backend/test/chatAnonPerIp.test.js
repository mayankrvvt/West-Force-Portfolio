import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp } from "./helpers/app";
import { stubGeminiFetch } from "./helpers/gemini.js";
import { startMongo, stopMongo } from "./helpers/mongo";

process.env.CHAT_ANON_DAILY_CAP = "100";
process.env.CHAT_ANON_DAILY_PER_IP = "2";

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
  delete process.env.CHAT_ANON_DAILY_CAP;
  delete process.env.CHAT_ANON_DAILY_PER_IP;
});

function chat(ip) {
  return request(app)
    .post("/api/chat")
    .set("X-Forwarded-For", ip)
    .send({ message: "Hi" });
}

describe("anonymous chat per-IP daily cap", () => {
  test("one IP is blocked after CHAT_ANON_DAILY_PER_IP chats; other IPs still work", async () => {
    expect((await chat("203.0.113.80")).status).toBe(200);
    expect((await chat("203.0.113.80")).status).toBe(200);

    const blocked = await chat("203.0.113.80");
    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    expect((await chat("203.0.113.81")).status).toBe(200);
  });

  test("a failed Gemini call refunds the per-IP slot", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    // Timeouts are not retried, so one failed try is final.
    const timeout = () =>
      new DOMException("The operation was aborted due to timeout", "TimeoutError");
    fetchMock.mockRejectedValueOnce(timeout());

    expect((await chat("203.0.113.90")).status).toBe(504);
    expect((await chat("203.0.113.90")).status).toBe(200);
    expect((await chat("203.0.113.90")).status).toBe(200);
    expect((await chat("203.0.113.90")).status).toBe(429);
  });
});
