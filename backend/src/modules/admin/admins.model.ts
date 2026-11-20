import mongoose, { type InferSchemaType } from "mongoose";

/**
 * An admin added in the portal by an owner. Owners themselves are the
 * ADMIN_EMAILS env list and are never stored here.
 */
const adminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // The owner's email.
    addedBy: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export type AdminUserAttrs = InferSchemaType<typeof adminUserSchema>;

export const AdminUser = mongoose.model("AdminUser", adminUserSchema);

export default AdminUser;
