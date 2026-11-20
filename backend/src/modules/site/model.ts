import mongoose, { type InferSchemaType } from "mongoose";

/** The one settings document has this fixed id. */
export const SITE_SETTINGS_ID = "site";

export const MAINTENANCE_MESSAGE_MAX = 300;
export const BANNER_TEXT_MAX = 200;
export const BANNER_TONES = ["info", "warning"] as const;
export const FEATURES = ["signups", "payments", "ai", "jobs"] as const;
export type Feature = (typeof FEATURES)[number];

/**
 * Site wide switches set by admins. A singleton: only the document with
 * _id "site" is used, and a missing document means the defaults.
 */
const siteSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: SITE_SETTINGS_ID },
    maintenance: {
      on: { type: Boolean, default: false },
      message: { type: String, default: "", maxlength: MAINTENANCE_MESSAGE_MAX },
    },
    banner: {
      on: { type: Boolean, default: false },
      text: { type: String, default: "", maxlength: BANNER_TEXT_MAX },
      tone: { type: String, enum: BANNER_TONES, default: "info" },
    },
    features: {
      signups: { type: Boolean, default: true },
      payments: { type: Boolean, default: true },
      ai: { type: Boolean, default: true },
      jobs: { type: Boolean, default: true },
    },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

export type SiteSettingsAttrs = InferSchemaType<typeof siteSettingsSchema>;

export const SiteSettings = mongoose.model("SiteSettings", siteSettingsSchema);

export default SiteSettings;
