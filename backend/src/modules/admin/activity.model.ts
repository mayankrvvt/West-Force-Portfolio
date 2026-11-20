import mongoose, { type InferSchemaType } from "mongoose";

export const ACTIVITY_TTL_SECONDS = 365 * 24 * 60 * 60;

export type ActivityAction =
  | "job.create"
  | "job.update"
  | "job.delete"
  | "admin.add"
  | "admin.remove"
  | "settings.update";

/** One admin write. Kept for 365 days (TTL index on `at`). Never holds secrets. */
const adminActivitySchema = new mongoose.Schema({
  actorEmail: { type: String, required: true },
  action: { type: String, required: true },
  target: { type: String, default: "" },
  details: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  at: { type: Date, default: () => new Date() },
});

adminActivitySchema.index({ at: 1 }, { expireAfterSeconds: ACTIVITY_TTL_SECONDS });

export type AdminActivityAttrs = InferSchemaType<typeof adminActivitySchema>;

export const AdminActivity = mongoose.model("AdminActivity", adminActivitySchema);

export default AdminActivity;
