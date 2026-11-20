import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp } from "./helpers/app";
import { stubGeminiFetch } from "./helpers/gemini.js";
import { startMongo, stopMongo } from "./helpers/mongo";

process.env.CHAT_ANON_DAILY_CAP = "3";

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
});

function chat(ip) {
  return request(app)
    .post("/api/chat")
    .set("X-Forwarded-For", ip)
    .send({ message: "Hi" });
}

describe("anonymous chat daily cap", () => {
  // Runs first: failed Gemini calls must give the slot back,
  // so the next test can still make all 3 successful calls.
  test("Gemini error, timeout or empty reply refunds the daily slot", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    // 5xx is retried once, so both tries fail here. A timeout is not retried.
    fetchMock
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(new Response("{}", { status: 500 }));
    expect((await chat("203.0.113.70")).status).toBe(502);

    const timeout = () =>
      new DOMException("The operation was aborted due to timeout", "TimeoutError");
    fetchMock.mockRejectedValueOnce(timeout());
    expect((await chat("203.0.113.71")).status).toBe(504);

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ candidates: [] }), { status: 200 })
    );
    expect((await chat("203.0.113.72")).status).toBe(502);

    fetchMock.mockRejectedValueOnce(new Error("network down"));
    expect((await chat("203.0.113.73")).status).toBe(500);

    vi.mocked(console.error).mockRestore();
  });

  test("blocks anonymous chat across all IPs once CHAT_ANON_DAILY_CAP is reached", async () => {
    fetchMock.mockClear();

    for (let i = 1; i <= 3; i += 1) {
      const res = await request(app)
        .post("/api/chat")
        .set("X-Forwarded-For", `203.0.113.${i}`)
        .send({ message: "Hi" });
      expect(res.status).toBe(200);
    }

    const blocked = await request(app)
      .post("/api/chat")
      .set("X-Forwarded-For", "203.0.113.50")
      .send({ message: "Hi" });

    expect(blocked.status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("invalid messages do not use up the daily cap", async () => {
    const res = await request(app)
      .post("/api/chat")
      .set("X-Forwarded-For", "203.0.113.60")
      .send({ message: "" });

    expect(res.status).toBe(400);
  });
});
