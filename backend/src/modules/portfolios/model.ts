import mongoose, { type HydratedDocument, type InferSchemaType } from "mongoose";

const text = { type: String, default: "" };

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, default: "", trim: true },
    type: { type: String, default: "", trim: true },
    fileUrl: text,
    publicId: text,
    resourceType: text,
    format: text,
    mimeType: text,
    size: { type: Number, default: 0 },
    protected: { type: Boolean, default: true },
  },
  { _id: true }
);

const portfolioSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },

    status: { type: String, enum: ["draft", "published"], default: "draft" },

    template: { type: String, default: "default" },

    profile: {
      name: text,
      title: text,
      location: text,
      email: text,
      phone: text,
      imageUrl: text,
      availableForWork: { type: Boolean, default: true },
    },

    hero: {
      greeting: { type: String, default: "Hello, I'm" },
      headline: text,
      description: text,
    },

    about: {
      title: { type: String, default: "About Me" },
      description: text,
      videoUrl: text,
      videoPublicId: text,
      videoStatus: text,
    },

    experience: { type: [mongoose.Schema.Types.Mixed], default: [] },
    education: { type: [mongoose.Schema.Types.Mixed], default: [] },
    skills: { type: [mongoose.Schema.Types.Mixed], default: [] },

    documents: { type: [documentSchema], default: [] },

    resume: {
      name: text,
      fileUrl: text,
      publicId: text,
      resourceType: text,
      format: text,
      mimeType: text,
    },

    socialLinks: {
      linkedin: text,
      github: text,
      website: text,
      instagram: text,
    },

    documentProtection: {
      enabled: { type: Boolean, default: false },
      // Never sent to clients. v1: sha256 hex; v2: "scrypt$<salt>$<hash>".
      pinHash: { type: String, default: "", select: false },
      // 4 (legacy) or 6. Missing on old records = 4.
      pinLength: { type: Number, default: null },
      // 1 = sha256(secret:pin), 2 = scrypt. Missing on old records = 1.
      pinHashVersion: { type: Number, default: null },
    },

    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export type PortfolioAttrs = InferSchemaType<typeof portfolioSchema>;
export type PortfolioDocument = HydratedDocument<PortfolioAttrs>;

const Portfolio = mongoose.model("Portfolio", portfolioSchema);

export default Portfolio;
