import mongoose, { type HydratedDocument, type InferSchemaType } from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: "",
    },
    photoURL: {
      type: String,
      default: "",
    },
    // What the daily job collector searches for and /api/jobs/for-me matches.
    jobPreferences: {
      titles: { type: [String], default: [] },
      city: { type: String, trim: true, default: "" },
      // Province or territory code ("ON"), or "" when not set.
      province: { type: String, trim: true, default: "" },
      remoteOk: { type: Boolean, default: true },
      // Opt in to the weekly "new jobs for you" email (npm run jobs:digest).
      weeklyEmail: { type: Boolean, default: false },
    },
    // Copied from Firebase when a fresh token says the email is verified.
    // The weekly job email only goes to verified addresses.
    emailVerified: { type: Boolean, default: false },
    // Set once the welcome email went out, so it is never sent twice.
    welcomeSentAt: { type: Date, default: null },
    // Jobs the user marked "Not interested"; /api/jobs/for-me skips them. Newest last, capped.
    hiddenJobIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  },
  {
    timestamps: true,
  }
);

export type UserAttrs = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<UserAttrs>;

const User = mongoose.model("User", userSchema);

export default User;
