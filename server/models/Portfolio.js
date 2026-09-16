const mongoose = require("mongoose");

const experienceSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    startDate: {
      type: String,
      default: "",
    },
    endDate: {
      type: String,
      default: "",
    },
    current: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const educationSchema = new mongoose.Schema(
  {
    institution: {
      type: String,
      default: "",
    },
    degree: {
      type: String,
      default: "",
    },
    field: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },
    startDate: {
      type: String,
      default: "",
    },
    endDate: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
    },
    level: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      default: "",
    },
    fileUrl: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

const socialLinksSchema = new mongoose.Schema(
  {
    linkedin: {
      type: String,
      default: "",
    },
    github: {
      type: String,
      default: "",
    },
    twitter: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
  },
  { _id: false }
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

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },

    template: {
      type: String,
      default: "default",
    },

    profile: {
      name: {
        type: String,
        default: "",
      },
      title: {
        type: String,
        default: "",
      },
      location: {
        type: String,
        default: "",
      },
      email: {
        type: String,
        default: "",
      },
      phone: {
        type: String,
        default: "",
      },
      imageUrl: {
        type: String,
        default: "",
      },
      availableForWork: {
        type: Boolean,
        default: false,
      },
    },

    hero: {
      greeting: {
        type: String,
        default: "",
      },
      headline: {
        type: String,
        default: "",
      },
      description: {
        type: String,
        default: "",
      },
    },

    about: {
      title: {
        type: String,
        default: "",
      },
      description: {
        type: String,
        default: "",
      },
      videoUrl: {
        type: String,
        default: "",
      },
    },

    experience: {
      type: [experienceSchema],
      default: [],
    },

    education: {
      type: [educationSchema],
      default: [],
    },

    skills: {
      type: [skillSchema],
      default: [],
    },

    documents: {
      type: [documentSchema],
      default: [],
    },

    resume: {
      name: {
        type: String,
        default: "",
      },
      fileUrl: {
        type: String,
        default: "",
      },
    },

    socialLinks: {
      type: socialLinksSchema,
      default: () => ({}),
    },

    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Portfolio", portfolioSchema);