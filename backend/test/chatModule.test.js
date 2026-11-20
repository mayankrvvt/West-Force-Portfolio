import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import request from "supertest";
import { loadApp } from "./helpers/app";
import { stubGeminiFetch } from "./helpers/gemini.js";
import { startMongo, stopMongo } from "./helpers/mongo";
import { createMemoryLimitStore } from "../src/modules/chat/limits";
import { buildContents, cleanHistory } from "../src/modules/chat/service";

describe("chat limit store (in memory)", () => {
  test("15 requests per minute per IP, then retryAfter; resets after the window", async () => {
    let now = 1_000_000;
    const store = createMemoryLimitStore(() => now);

    for (let i = 0; i < 15; i += 1) {
      expect((await store.hitRateLimit("1.1.1.1")).allowed).toBe(true);
    }
    expect(await store.hitRateLimit("1.1.1.1")).toEqual({ allowed: false, retryAfter: 60 });
    expect((await store.hitRateLimit("2.2.2.2")).allowed).toBe(true);

    now += 60_000;
    expect((await store.hitRateLimit("1.1.1.1")).allowed).toBe(true);
  });

  test("daily caps come from env; a refund from yesterday is ignored", async () => {
    process.env.CHAT_ANON_DAILY_CAP = "2";
    process.env.CHAT_ANON_DAILY_PER_IP = "5";
    let now = Date.UTC(2026, 0, 1, 23, 59);
    const store = createMemoryLimitStore(() => now);

    try {
      const first = await store.takeAnonSlot("a");
      await store.takeAnonSlot("b");
      expect(await store.takeAnonSlot("c")).toEqual({ blocked: "global" });

      now = Date.UTC(2026, 0, 2, 0, 1);
      await store.takeAnonSlot("a");
      await store.refundAnonSlot(first.slot); // yesterday's slot: no effect
      await store.takeAnonSlot("a");
      expect(await store.takeAnonSlot("a")).toEqual({ blocked: "global" });
    } finally {
      delete process.env.CHAT_ANON_DAILY_CAP;
      delete process.env.CHAT_ANON_DAILY_PER_IP;
    }
  });
});

describe("chat context", () => {
  test("history: drops bad entries and leading model turns, merges same-role turns", () => {
    expect(
      cleanHistory([
        { role: "model", text: "Welcome" },
        { role: "user", text: " a " },
        { role: "system", text: "ignored" },
        { role: "user", text: "b" },
        { role: "model", text: "   " },
        { role: "model", text: "c" },
        null,
      ])
    ).toEqual([
      { role: "user", parts: [{ text: "a\n\nb" }] },
      { role: "model", parts: [{ text: "c" }] },
    ]);
    expect(cleanHistory("nope")).toEqual([]);
  });

  test("the new message is the last user turn", () => {
    expect(buildContents("hi", undefined)).toEqual([{ role: "user", parts: [{ text: "hi" }] }]);
  });
});

describe("POST /api/chat validation", () => {
  let app;

  beforeAll(async () => {
    stubGeminiFetch();
    // Guest daily caps are stored in MongoDB.
    await startMongo();
    app = await loadApp();
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    await stopMongo();
  });

  test.each([
    [undefined, "Please enter a message."],
    [42, "Please enter a message."],
    ["   ", "Please enter a message."],
    ["x".repeat(4001), "Your message is too long. Please keep it under 4000 characters."],
  ])("message %j -> 400", async (message, expected) => {
    const res = await request(app)
      .post("/api/chat")
      .set("X-Forwarded-For", "198.51.100.40")
      .send(message === undefined ? {} : { message });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, message: expected });
  });

  test("Gemini HTTP 404 -> 502 with model message and debug outside production", async () => {
    fetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: "nf" }), { status: 404 }));

    const res = await request(app)
      .post("/api/chat")
      .set("X-Forwarded-For", "198.51.100.41")
      .send({ message: "hi" });

    expect(res.status).toBe(502);
    expect(res.body.message).toMatch(/^The Gemini model ".+" was not found\.$/);
    expect(res.body.debug).toEqual({ error: "nf" });
  });

  test("success body: message and model", async () => {
    const res = await request(app)
      .post("/api/chat")
      .set("X-Forwarded-For", "198.51.100.42")
      .send({ message: "hi", history: [{ role: "user", text: "earlier" }] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: "Hello from fake Gemini.",
      model: expect.any(String),
    });
    const sent = JSON.parse(fetch.mock.calls.at(-1)[1].body);
    expect(sent.contents).toEqual([
      // As before: the new message is appended, not merged into the history.
      { role: "user", parts: [{ text: "earlier" }] },
      { role: "user", parts: [{ text: "hi" }] },
    ]);
  });
});
