import mongoose, { type HydratedDocument, type InferSchemaType } from "mongoose";

const text = { type: String, default: "" };

/** Sources the daily collector fills (see collect.ts). */
export const COLLECTED_SOURCES = ["greenhouse", "lever", "jooble"] as const;
export type CollectedSource = (typeof COLLECTED_SOURCES)[number];

/** Jobs the admin adds by hand at /admin/jobs. The collector never deletes them. */
export const MANUAL_SOURCE = "manual" as const;

/** Every source a job may come from and be listed with. */
export const LISTED_SOURCES = [...COLLECTED_SOURCES, MANUAL_SOURCE] as const;

/**
 * A job the daily collector stored from a collected source, or one the admin
 * added by hand (source "manual"). Hidden or expired jobs are not listed.
 */
const jobSchema = new mongoose.Schema(
  {
    externalId: { type: String, required: true },
    source: { type: String, enum: LISTED_SOURCES, required: true },
    title: { type: String, required: true, trim: true },
    company: text,
    location: text,
    type: text,
    salaryMin: { type: Number, default: null },
    salaryMax: { type: Number, default: null },
    description: text,
    url: text,
    postedAt: { type: Date, default: null },
    tags: { type: [String], default: [] },
    hidden: { type: Boolean, default: false },
    // null means it never expires.
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

jobSchema.index({ source: 1, externalId: 1 }, { unique: true });
jobSchema.index({ postedAt: -1 });
jobSchema.index(
  { title: "text", company: "text", description: "text", tags: "text" },
  { weights: { title: 5, tags: 3, company: 2, description: 1 }, name: "job_text" }
);

export type JobAttrs = InferSchemaType<typeof jobSchema>;
export type JobDocument = HydratedDocument<JobAttrs>;

export const Job = mongoose.model("Job", jobSchema);

export default Job;
