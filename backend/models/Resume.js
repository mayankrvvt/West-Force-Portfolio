const mongoose = require("mongoose");

const experienceSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: "",
    },
    company: {
      type: String,
      default: "",
    },
    position: {
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
    bullets: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const educationSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: "",
    },
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
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    technologies: {
      type: [String],
      default: [],
    },
    bullets: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const certificationSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      default: "",
    },
    name: {
      type: String,
      default: "",
    },
    issuer: {
      type: String,
      default: "",
    },
    year: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    // Firebase user UID
    userId: {
      type: String,
      required: true,
      index: true,
    },

    title: {
      type: String,
      default: "Software Engineer Resume",
    },

    fileName: {
      type: String,
      default: "WestForce_Resume.pdf",
    },

    version: {
      type: Number,
      default: 1,
    },

    status: {
      type: String,
      default: "draft",
    },

    template: {
      type: String,
      default: "canadian-ats",
    },

    targetRole: {
      type: String,
      default: "Software Engineer",
    },

    country: {
      type: String,
      default: "Canada",
    },

    experienceLevel: {
      type: String,
      default: "Entry Level",
    },

    atsScore: {
      type: Number,
      default: null,
    },

    content: {
      name: {
        type: String,
        default: "",
      },

      title: {
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

      location: {
        type: String,
        default: "",
      },

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

      summary: {
        type: String,
        default: "",
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
        type: [String],
        default: [],
      },

      projects: {
        type: [projectSchema],
        default: [],
      },

      certifications: {
        type: [certificationSchema],
        default: [],
      },
    },

    ai: {
      provider: {
        type: String,
        default: "",
      },

      model: {
        type: String,
        default: "",
      },

      generatedAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Resume", resumeSchema);