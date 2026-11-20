import mongoose, { type HydratedDocument, type InferSchemaType } from "mongoose";

export const APPLICATION_STATUSES = ["Saved", "Applied", "Interview", "Offer", "Rejected"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

const text = { type: String, default: "", trim: true };

const applicationSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Set when the application was saved from a cached job; empty for manual entries.
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", default: null },
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    location: text,
    url: text,
    status: { type: String, enum: APPLICATION_STATUSES, default: "Saved" },
    appliedAt: { type: Date, default: null },
    notes: text,
  },
  { timestamps: true }
);

// One application per job per user; manual entries (no jobId) are not limited.
applicationSchema.index(
  { ownerId: 1, jobId: 1 },
  { unique: true, partialFilterExpression: { jobId: { $type: "objectId" } } }
);
applicationSchema.index({ ownerId: 1, updatedAt: -1 });

export type ApplicationAttrs = InferSchemaType<typeof applicationSchema>;
export type ApplicationDocument = HydratedDocument<ApplicationAttrs>;

const Application = mongoose.model("Application", applicationSchema);

export default Application;
