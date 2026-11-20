import mongoose, { type HydratedDocument, type InferSchemaType } from "mongoose";

const text = { type: String, default: "" };

/** A job from an outside source (Adzuna), cached so repeat views cost no quota. */
const jobSchema = new mongoose.Schema(
  {
    externalId: { type: String, required: true },
    source: { type: String, enum: ["adzuna"], required: true },
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

/**
 * One cached search result page: which jobs a query/page returned. Mongo's
 * TTL monitor removes it after expiresAt (reads also check expiresAt, since
 * the monitor only runs about once a minute).
 */
const jobSearchSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  jobIds: { type: [mongoose.Schema.Types.ObjectId], ref: "Job", default: [] },
  total: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
});

jobSearchSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const JobSearch = mongoose.model("JobSearch", jobSearchSchema);

export default Job;
