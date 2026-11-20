import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { startMongo, stopMongo } from "./helpers/mongo";
import { endOfUtcDay, takeUsage, releaseUsage, usageCount, utcDay } from "../src/lib/usageCounter";
import { createMongoLimitStore } from "../src/modules/chat/limits";

// MongoDB usage counters (ATS daily limit, guest chat caps). In-memory MongoDB only.
beforeAll(async () => {
  await startMongo();
});

afterAll(async () => {
  await stopMongo();
});

describe("usage counter", () => {
  test("counts up to the limit, then refuses; release gives one back", async () => {
    const expiresAt = endOfUtcDay(Date.now());

    expect(await takeUsage("t:a", 2, expiresAt)).toBe(true);
    expect(await takeUsage("t:a", 2, expiresAt)).toBe(true);
    expect(await takeUsage("t:a", 2, expiresAt)).toBe(false);
    expect(await usageCount("t:a")).toBe(2);

    await releaseUsage("t:a");
    expect(await takeUsage("t:a", 2, expiresAt)).toBe(true);
    expect(await takeUsage("t:zero", 0, expiresAt)).toBe(false);
    expect(await usageCount("t:zero")).toBe(0);
  });

  test("parallel takes cannot pass the limit", async () => {
    const expiresAt = endOfUtcDay(Date.now());
    const results = await Promise.all(
      Array.from({ length: 10 }, () => takeUsage("t:race", 3, expiresAt))
    );

    expect(results.filter(Boolean)).toHaveLength(3);
    expect(await usageCount("t:race")).toBe(3);
  });

  test("UTC day helpers", () => {
    const now = Date.UTC(2026, 10, 19, 23, 30);
    expect(utcDay(now)).toBe("2026-11-19");
    expect(endOfUtcDay(now).toISOString()).toBe("2026-11-20T01:00:00.000Z");
  });
});

describe("Mongo chat limit store", () => {
  test("global and per-IP daily caps, refunds, and a new UTC day", async () => {
    process.env.CHAT_ANON_DAILY_CAP = "3";
    process.env.CHAT_ANON_DAILY_PER_IP = "2";
    let now = Date.UTC(2026, 0, 1, 23, 59);
    const store = createMongoLimitStore(() => now);

    try {
      const first = await store.takeAnonSlot("a");
      await store.takeAnonSlot("a");
      // Per-IP block does not use up a global slot.
      expect(await store.takeAnonSlot("a")).toEqual({ blocked: "ip" });
      await store.takeAnonSlot("b");
      expect(await store.takeAnonSlot("c")).toEqual({ blocked: "global" });

      await store.refundAnonSlot(first.slot);
      expect(await store.takeAnonSlot("a")).toEqual({ slot: { day: "2026-01-01", ip: "a" } });

      now = Date.UTC(2026, 0, 2, 0, 1);
      expect(await store.takeAnonSlot("a")).toEqual({ slot: { day: "2026-01-02", ip: "a" } });
      await store.refundAnonSlot(first.slot); // yesterday's slot: today's counts unchanged
      await store.takeAnonSlot("b");
      await store.takeAnonSlot("c");
      expect(await store.takeAnonSlot("d")).toEqual({ blocked: "global" });
    } finally {
      delete process.env.CHAT_ANON_DAILY_CAP;
      delete process.env.CHAT_ANON_DAILY_PER_IP;
    }
  });

  test("daily caps survive a restart (a new store sees the same counts)", async () => {
    process.env.CHAT_ANON_DAILY_CAP = "100";
    process.env.CHAT_ANON_DAILY_PER_IP = "1";
    const now = Date.UTC(2026, 5, 1, 12);

    try {
      const before = createMongoLimitStore(() => now);
      expect((await before.takeAnonSlot("9.9.9.9")).slot).toBeDefined();

      const afterRestart = createMongoLimitStore(() => now);
      expect(await afterRestart.takeAnonSlot("9.9.9.9")).toEqual({ blocked: "ip" });
    } finally {
      delete process.env.CHAT_ANON_DAILY_CAP;
      delete process.env.CHAT_ANON_DAILY_PER_IP;
    }
  });
});

describe("ATS daily limit middleware", () => {
  async function runCheck(uid, finish) {
    vi.doMock("../src/lib/clients/firebase", () => ({ default: {}, admin: {}, firebaseAuth: {} }));
    const { EventEmitter } = await import("node:events");
    const { atsDailyLimit, atsUsageKey } = await import("../src/modules/ats/limits");
    const req = { user: { uid }, log: { warn() {} } };
    const res = Object.assign(new EventEmitter(), { statusCode: 200, writableFinished: false });
    await atsDailyLimit(req, res, () => {});
    finish(res);
    await new Promise((resolve) => setTimeout(resolve, 50));
    return usageCount(atsUsageKey(uid));
  }

  test("a client that leaves early still uses up its check (the AI call already ran)", async () => {
    const count = await runCheck("ats-abort", (res) => res.emit("close"));
    expect(count).toBe(1);
  });

  test("a limit of 0 says the feature is turned off", async () => {
    const { EventEmitter } = await import("node:events");
    const { dailyUsageLimit } = await import("../src/middleware/dailyLimit");
    const middleware = dailyUsageLimit({
      name: "off-feature",
      limit: () => 0,
      code: "OFF_LIMIT",
      message: (limit) => `You have used all ${limit} runs for today.`,
    });
    let sent;
    const req = { user: { uid: "off-user" }, id: "r1", log: { warn() {} } };
    const res = Object.assign(new EventEmitter(), {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        sent = body;
        return this;
      },
    });
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(429);
    expect(sent).toMatchObject({ code: "OFF_LIMIT", message: "This feature is turned off right now." });
  });

  test("a failed check is given back", async () => {
    const count = await runCheck("ats-fail", (res) => {
      res.statusCode = 500;
      res.writableFinished = true;
      res.emit("finish");
    });
    expect(count).toBe(0);
  });
});
