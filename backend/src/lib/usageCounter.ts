import mongoose from "mongoose";

/*
 * Small shared usage counters in MongoDB (e.g. "ats:<uid>:2026-11-19").
 * A restart does not reset them and every instance sees the same count.
 * The TTL index removes a counter once expiresAt has passed.
 */

export type UsageCounterDoc = { key: string; count: number; expiresAt: Date };

const DUPLICATE_KEY = 11000;

const usageCounterSchema = new mongoose.Schema<UsageCounterDoc>({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export const UsageCounter = mongoose.model<UsageCounterDoc>("UsageCounter", usageCounterSchema);

/** "YYYY-MM-DD" in UTC. */
export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** End of the UTC day plus one hour, so the TTL never removes today's counter early. */
export function endOfUtcDay(now: number): Date {
  const date = new Date(now);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 1)
  );
}

const isDuplicateKey = (error: unknown) =>
  (error as { code?: unknown } | null)?.code === DUPLICATE_KEY;

/**
 * Adds one use when the counter is below `limit`, in one atomic update.
 * Returns false (nothing counted) when the limit is already reached.
 *
 * When the counter is full the filter does not match, so the upsert tries to
 * insert a second document with the same key and fails with a duplicate-key
 * error: that means "full". Two first-ever requests racing on the insert can
 * also hit it, so it tries once more before answering.
 */
export async function takeUsage(key: string, limit: number, expiresAt: Date): Promise<boolean> {
  if (limit <= 0) return false;

  // The "full" check needs the unique index on key, so wait until it is built
  // (on a fresh database). Mongoose runs this once per model and caches it.
  await UsageCounter.init();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await UsageCounter.updateOne(
        { key, count: { $lt: limit } },
        { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
        { upsert: true }
      );
      return true;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }

  return false;
}

/** Gives back one use (e.g. the request failed). Never goes below zero. */
export async function releaseUsage(key: string): Promise<void> {
  await UsageCounter.updateOne({ key, count: { $gt: 0 } }, { $inc: { count: -1 } });
}

/** The current count for a key (0 when there is none). */
export async function usageCount(key: string): Promise<number> {
  const counter = await UsageCounter.findOne({ key }).lean<UsageCounterDoc>();
  return counter?.count ?? 0;
}
