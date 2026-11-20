import mongoose, { type HydratedDocument, type InferSchemaType } from "mongoose";

const checkSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    weight: { type: Number, required: true },
    points: { type: Number, required: true },
    status: { type: String, enum: ["pass", "warn", "fail"], required: true },
    detail: { type: String, default: "" },
    fixes: { type: [String], default: [] },
  },
  { _id: false }
);

/** One ATS check a user ran, kept so they can see their score over time. */
const atsCheckSchema = new mongoose.Schema(
  {
    // Firebase uid, like Resume.userId.
    userId: { type: String, required: true },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: "Resume", default: null },
    resumeTitle: { type: String, default: "" },
    jobTitle: { type: String, default: "" },
    jobSnippet: { type: String, default: "" },
    score: { type: Number, required: true },
    checks: { type: [checkSchema], default: [] },
    matched: { type: [String], default: [] },
    missing: { type: [String], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

atsCheckSchema.index({ userId: 1, createdAt: -1 });

export type AtsCheckAttrs = InferSchemaType<typeof atsCheckSchema>;
export type AtsCheckDocument = HydratedDocument<AtsCheckAttrs>;

const AtsCheck = mongoose.model("AtsCheck", atsCheckSchema);

export default AtsCheck;
