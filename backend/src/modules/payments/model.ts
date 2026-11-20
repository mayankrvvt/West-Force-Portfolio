import mongoose, { type HydratedDocument, type InferSchemaType } from "mongoose";

export const PLAN_KEYS = ["solo", "group5"] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

const purchaseSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, index: true },
    purchaserEmail: { type: String, required: true, lowercase: true, trim: true },
    memberEmails: { type: [String], default: [] },
    plan: { type: String, enum: PLAN_KEYS, required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },
    stripeSessionId: { type: String, unique: true, sparse: true },
    stripePaymentIntentId: { type: String, default: "" },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const entitlementSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    firebaseUid: { type: String, default: null, index: true },
    plan: { type: String, enum: PLAN_KEYS, required: true },
    purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase", required: true },
    grantedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export type PurchaseDocument = HydratedDocument<InferSchemaType<typeof purchaseSchema>>;
export type EntitlementDocument = HydratedDocument<InferSchemaType<typeof entitlementSchema>>;

export const Purchase = mongoose.model("Purchase", purchaseSchema);
export const Entitlement = mongoose.model("Entitlement", entitlementSchema);
