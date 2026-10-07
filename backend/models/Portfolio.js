const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
      trim: true,
    },

    type: {
      type: String,
      default: "",
      trim: true,
    },

    fileUrl: {
      type: String,
      default: "",
    },

    publicId: {
      type: String,
      default: "",
    },

    resourceType: {
      type: String,
      default: "",
    },

    format: {
      type: String,
      default: "",
    },

    size: {
      type: Number,
      default: 0,
    },

    protected: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: true,
  }
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
        default: true,
      },
    },

    hero: {
      greeting: {
        type: String,
        default: "Hello, I'm",
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
        default: "About Me",
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
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    education: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    skills: {
      type: [mongoose.Schema.Types.Mixed],
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
      linkedin: {
        type: String,
        default: "",
      },

      github: {
        type: String,
        default: "",
      },

      website: {
        type: String,
        default: "",
      },

      instagram: {
        type: String,
        default: "",
      },
    },

    documentProtection: {
      enabled: {
        type: Boolean,
        default: false,
      },

      pinHash: {
        type: String,
        default: "",
        select: false,
      },
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

module.exports = mongoose.model(
  "Portfolio",
  portfolioSchema
);