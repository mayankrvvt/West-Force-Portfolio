/*
 * Chat limits:
 *  - per client IP: 15 requests / minute (all chats, signed in or not);
 *  - signed-out chats per UTC day: one global cap (CHAT_ANON_DAILY_CAP, default 500)
 *    and one per IP (CHAT_ANON_DAILY_PER_IP, default 10);
 *  - signed-in chats per uid per UTC day: CHAT_FREE_DAILY (default 30) without a
 *    plan, CHAT_PAID_DAILY (default 200) with one.
 * A daily slot is refunded when Gemini fails, so nobody is charged for errors.
 *
 * The daily caps live in MongoDB (createMongoLimitStore), so a restart does not
 * reset them. The per-minute limiter stays in memory: it resets on restart and
 * is per instance, which is fine for a one-minute window.
 */

import { endOfUtcDay, releaseUsage, takeUsage, utcDay } from "../../lib/usageCounter";

export const RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const RATE_LIMIT_MAX_REQUESTS = 15;
const DEFAULT_ANON_DAILY_CAP = 500;
const DEFAULT_ANON_DAILY_PER_IP = 10;
const DEFAULT_FREE_DAILY = 30;
const DEFAULT_PAID_DAILY = 200;
const RATE_LIMIT_SWEEP_SIZE = 10_000;

export type RateLimitResult = { allowed: true; retryAfter: 0 } | { allowed: false; retryAfter: number };

/** A taken daily slot, needed to refund it. */
export type AnonSlot = { day: string; ip: string };

export type AnonSlotResult = { blocked: "global" | "ip" } | { blocked?: undefined; slot: AnonSlot };

/** A taken daily slot of a signed-in user, needed to refund it. */
export type UserSlot = { day: string; uid: string };

export type UserTier = "free" | "paid";

export type UserSlotResult = { blocked: true } | { blocked?: undefined; slot: UserSlot };

export interface ChatLimitStore {
  /** Count one request for this IP against the per-minute limit. */
  hitRateLimit(ip: string): Promise<RateLimitResult>;
  /** Count one signed-out chat against both daily caps, unless a cap is already hit. */
  takeAnonSlot(ip: string): Promise<AnonSlotResult>;
  /** Give a slot back (ignored after the UTC day has rolled over). */
  refundAnonSlot(slot: AnonSlot): Promise<void>;
  /** Count one signed-in chat against the user's daily cap for their tier. */
  takeUserSlot(uid: string, tier: UserTier): Promise<UserSlotResult>;
  /** Give a signed-in slot back (ignored after the UTC day has rolled over). */
  refundUserSlot(slot: UserSlot): Promise<void>;
}

function readCap(value: string | undefined, fallback: number): number {
  const cap = Number.parseInt(value ?? "", 10);
  return Number.isInteger(cap) && cap >= 0 ? cap : fallback;
}

/** Read on every request so the caps can change without a code change. */
export function anonDailyCaps(env: NodeJS.ProcessEnv = process.env) {
  return {
    global: readCap(env.CHAT_ANON_DAILY_CAP, DEFAULT_ANON_DAILY_CAP),
    perIp: readCap(env.CHAT_ANON_DAILY_PER_IP, DEFAULT_ANON_DAILY_PER_IP),
  };
}

/** Daily chats per signed-in user, by tier. Read on every request. */
export function userDailyCap(tier: UserTier, env: NodeJS.ProcessEnv = process.env): number {
  return tier === "paid"
    ? readCap(env.CHAT_PAID_DAILY, DEFAULT_PAID_DAILY)
    : readCap(env.CHAT_FREE_DAILY, DEFAULT_FREE_DAILY);
}

export function createMemoryLimitStore(clock: () => number = Date.now): ChatLimitStore {
  const rateLimits = new Map<string, { startedAt: number; count: number }>();
  const anon = { day: "", count: 0, perIp: new Map<string, number>() };
  const users = new Map<string, number>();

  function startDayIfNeeded(): string {
    const today = utcDay(clock());
    if (anon.day !== today) {
      anon.day = today;
      anon.count = 0;
      anon.perIp.clear();
      users.clear();
    }
    return today;
  }

  // Plain functions here; the store methods below wrap them in promises.
  const sync = {
    hitRateLimit(ip: string): RateLimitResult {
      const now = clock();

      // Drop expired entries so the map cannot grow forever.
      if (rateLimits.size > RATE_LIMIT_SWEEP_SIZE) {
        for (const [key, entry] of rateLimits) {
          if (now - entry.startedAt >= RATE_LIMIT_WINDOW_MS) rateLimits.delete(key);
        }
      }

      const existing = rateLimits.get(ip);

      if (!existing || now - existing.startedAt >= RATE_LIMIT_WINDOW_MS) {
        rateLimits.set(ip, { startedAt: now, count: 1 });
        return { allowed: true, retryAfter: 0 };
      }

      if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
        return {
          allowed: false,
          retryAfter: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - existing.startedAt)) / 1000),
        };
      }

      existing.count += 1;
      return { allowed: true, retryAfter: 0 };
    },

    takeAnonSlot(ip: string): AnonSlotResult {
      const day = startDayIfNeeded();
      const caps = anonDailyCaps();

      if (anon.count >= caps.global) return { blocked: "global" };

      const ipCount = anon.perIp.get(ip) || 0;
      if (ipCount >= caps.perIp) return { blocked: "ip" };

      anon.count += 1;
      anon.perIp.set(ip, ipCount + 1);
      return { slot: { day, ip } };
    },

    refundAnonSlot(slot: AnonSlot): void {
      if (slot.day !== anon.day) return;

      anon.count = Math.max(0, anon.count - 1);

      const ipCount = anon.perIp.get(slot.ip) || 0;
      if (ipCount <= 1) {
        anon.perIp.delete(slot.ip);
      } else {
        anon.perIp.set(slot.ip, ipCount - 1);
      }
    },

    takeUserSlot(uid: string, tier: UserTier): UserSlotResult {
      const day = startDayIfNeeded();
      const count = users.get(uid) || 0;
      if (count >= userDailyCap(tier)) return { blocked: true };

      users.set(uid, count + 1);
      return { slot: { day, uid } };
    },

    refundUserSlot(slot: UserSlot): void {
      if (slot.day !== anon.day) return;

      const count = users.get(slot.uid) || 0;
      if (count <= 1) {
        users.delete(slot.uid);
      } else {
        users.set(slot.uid, count - 1);
      }
    },
  };

  return {
    hitRateLimit: (ip) => Promise.resolve(sync.hitRateLimit(ip)),
    takeAnonSlot: (ip) => Promise.resolve(sync.takeAnonSlot(ip)),
    refundAnonSlot: (slot) => Promise.resolve(sync.refundAnonSlot(slot)),
    takeUserSlot: (uid, tier) => Promise.resolve(sync.takeUserSlot(uid, tier)),
    refundUserSlot: (slot) => Promise.resolve(sync.refundUserSlot(slot)),
  };
}

const anonGlobalKey = (day: string) => `chat:anon:global:${day}`;
const anonIpKey = (day: string, ip: string) => `chat:anon:ip:${ip}:${day}`;
// One counter per user per day; the cap depends on the tier at request time.
const userKey = (day: string, uid: string) => `chat:user:${uid}:${day}`;

/**
 * Daily caps in MongoDB (one counter per UTC day for all guests, one per IP),
 * per-minute limit in memory. Each take is one atomic update, so parallel
 * requests cannot pass a cap.
 */
export function createMongoLimitStore(clock: () => number = Date.now): ChatLimitStore {
  const memory = createMemoryLimitStore(clock);

  return {
    hitRateLimit: (ip) => memory.hitRateLimit(ip),

    async takeAnonSlot(ip) {
      const now = clock();
      const day = utcDay(now);
      const expiresAt = endOfUtcDay(now);
      const caps = anonDailyCaps();

      if (!(await takeUsage(anonGlobalKey(day), caps.global, expiresAt))) {
        return { blocked: "global" };
      }

      if (!(await takeUsage(anonIpKey(day, ip), caps.perIp, expiresAt))) {
        await releaseUsage(anonGlobalKey(day));
        return { blocked: "ip" };
      }

      return { slot: { day, ip } };
    },

    // Counters are per day, so a refund after midnight only touches yesterday's.
    async refundAnonSlot(slot) {
      await Promise.all([
        releaseUsage(anonGlobalKey(slot.day)),
        releaseUsage(anonIpKey(slot.day, slot.ip)),
      ]);
    },

    async takeUserSlot(uid, tier) {
      const now = clock();
      const day = utcDay(now);

      if (!(await takeUsage(userKey(day, uid), userDailyCap(tier), endOfUtcDay(now)))) {
        return { blocked: true };
      }

      return { slot: { day, uid } };
    },

    async refundUserSlot(slot) {
      await releaseUsage(userKey(slot.day, slot.uid));
    },
  };
}

/** The store the chat route uses. */
export const chatLimits: ChatLimitStore = createMongoLimitStore();
