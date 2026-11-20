import mongoose, { type InferSchemaType } from "mongoose";

export const EVENT_TYPES = ["view", "unlock", "document"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Events are removed by MongoDB about 400 days after they happen. */
export const EVENT_TTL_SECONDS = 400 * 24 * 60 * 60;

/*
 * One row per visitor, per day, per kind of event (and per document for
 * "document"). visitorHash is an HMAC that changes every day, so rows from
 * different days cannot be linked. No raw IP or user agent is ever stored.
 */
const portfolioEventSchema = new mongoose.Schema(
  {
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: "Portfolio", required: true },
    type: { type: String, enum: EVENT_TYPES, required: true },
    // Only for "document" events; null otherwise so the unique index still dedupes.
    documentId: { type: String, default: null },
    documentName: { type: String, default: "" },
    day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    visitorHash: { type: String, required: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { versionKey: false }
);

portfolioEventSchema.index(
  { portfolioId: 1, type: 1, day: 1, visitorHash: 1, documentId: 1 },
  { unique: true }
);
portfolioEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: EVENT_TTL_SECONDS });
portfolioEventSchema.index({ portfolioId: 1, createdAt: -1 });

export type PortfolioEventAttrs = InferSchemaType<typeof portfolioEventSchema>;

const PortfolioEvent = mongoose.model("PortfolioEvent", portfolioEventSchema);

export default PortfolioEvent;
