import mongoose, { type HydratedDocument, type InferSchemaType } from "mongoose";

const text = { type: String, default: "" };
const textList = { type: [String], default: [] };

const experienceSchema = new mongoose.Schema(
  {
    id: text,
    company: text,
    position: text,
    location: text,
    startDate: text,
    endDate: text,
    bullets: textList,
  },
  { _id: false }
);

const educationSchema = new mongoose.Schema(
  {
    id: text,
    institution: text,
    degree: text,
    field: text,
    location: text,
    startDate: text,
    endDate: text,
    description: text,
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    id: text,
    name: text,
    description: text,
    technologies: textList,
    bullets: textList,
  },
  { _id: false }
);

const certificationSchema = new mongoose.Schema(
  {
    id: text,
    name: text,
    issuer: text,
    year: text,
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    // Firebase uid. Still written on every save (expand/contract).
    userId: { type: String, required: true, index: true },

    // Mongo User _id, like Portfolio.userId. New saves fill it; old records
    // get it from scripts/migrate-resume-owner.ts. Reads match either field.
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },

    title: { type: String, default: "Software Engineer Resume" },
    fileName: { type: String, default: "WestForce_Resume.pdf" },
    version: { type: Number, default: 1 },
    status: { type: String, default: "draft" },
    template: { type: String, default: "canadian-ats" },
    targetRole: { type: String, default: "Software Engineer" },
    country: { type: String, default: "Canada" },
    experienceLevel: { type: String, default: "Entry Level" },
    atsScore: { type: Number, default: null },

    content: {
      name: text,
      title: text,
      email: text,
      phone: text,
      location: text,
      linkedin: text,
      github: text,
      website: text,
      summary: text,
      experience: { type: [experienceSchema], default: [] },
      education: { type: [educationSchema], default: [] },
      skills: textList,
      projects: { type: [projectSchema], default: [] },
      certifications: { type: [certificationSchema], default: [] },
    },

    ai: {
      provider: text,
      model: text,
      generatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

export type ResumeAttrs = InferSchemaType<typeof resumeSchema>;
export type ResumeDocument = HydratedDocument<ResumeAttrs>;

const Resume = mongoose.model("Resume", resumeSchema);

export default Resume;
