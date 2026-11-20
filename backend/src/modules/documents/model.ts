import mongoose from "mongoose";

export type PinAttemptCounter = { key: string; count: number; expiresAt: Date };

type CounterModel = Pick<mongoose.Model<PinAttemptCounter>, "findOneAndUpdate">;

/* Starts a new window when there is no active counter, else adds one. */
async function reserveCounter(
  model: CounterModel,
  key: string,
  windowMs: number,
  now: Date
): Promise<PinAttemptCounter> {
  const isActive = { $gt: ["$expiresAt", now] };

  const counter = await model
    .findOneAndUpdate(
      { key },
      [
        {
          $set: {
            count: { $cond: [isActive, { $add: ["$count", 1] }, 1] },
            expiresAt: {
              $cond: [isActive, "$expiresAt", new Date(now.getTime() + windowMs)],
            },
          },
        },
      ],
      { upsert: true, returnDocument: "after", updatePipeline: true }
    )
    .lean<PinAttemptCounter>();

  // upsert + returnDocument "after" always returns a document.
  return counter;
}

/*
 * Failed document-PIN tries, one counter per key
 * (e.g. "ip:<ip>:<slug>" or "portfolio:<id>").
 * Stored in MongoDB so a server restart does not reset lockouts.
 * The TTL index removes a record once its window has ended.
 */
const pinAttemptSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  {
    statics: {
      /*
       * The active counter for a key, or null. MongoDB's TTL cleanup runs
       * about once a minute, so expired records are also ignored here.
       */
      findActive(key: string, now: Date = new Date()) {
        return this.findOne({ key, expiresAt: { $gt: now } }).lean<PinAttemptCounter>();
      },

      /*
       * Adds one try in a single atomic update and returns the counter.
       * Callers reserve a try BEFORE checking the PIN, so parallel requests
       * cannot all slip past the limit.
       */
      reserve(key: string, windowMs: number, now: Date = new Date()) {
        return reserveCounter(this, key, windowMs, now);
      },

      /* Adds one failed try. Returns the new count. */
      async recordFailure(key: string, windowMs: number, now: Date = new Date()) {
        const counter = await reserveCounter(this, key, windowMs, now);
        return counter.count;
      },

      /*
       * Gives back one reserved try (it turned out to be the right PIN,
       * or another limit rejected it before the PIN was checked).
       */
      release(key: string) {
        return this.updateOne({ key, count: { $gt: 0 } }, { $inc: { count: -1 } });
      },
    },
  }
);

const PinAttempt = mongoose.model("PinAttempt", pinAttemptSchema);

export default PinAttempt;
