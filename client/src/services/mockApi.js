const STORAGE = {
  resumes: "westforce_mock_resumes",
  applications: "westforce_mock_applications",
};

const wait = (milliseconds = 350) =>
  new Promise((resolve) =>
    setTimeout(resolve, milliseconds)
  );


/* =========================================================
   DEMO RESUMES
========================================================= */

const seedResumes = [
  {
    id: "resume-1",

    title:
      "Software Developer — Canada",

    fileName:
      "Mayank_Rawat_Resume.pdf",

    atsScore: 86,

    version: 3,

    updatedAt:
      "2026-09-15T12:00:00.000Z",

    status:
      "ATS optimized",

    template:
      "professional",

    targetRole:
      "Software Developer",

    industry:
      "Technology",

    country:
      "Canada",

    experienceLevel:
      "Student / Recent Graduate",

    resumeStyle:
      "Canadian Professional",

    format: {
      country: "Canada",
      style: "Canadian Professional",
      atsFriendly: true,
      photo: false,
      dateOfBirth: false,
      maritalStatus: false,
      sin: false,
    },

    content: {
      name:
        "Mayank Rawat",

      title:
        "Software Developer",

      location:
        "Dehradun, Uttarakhand, India",

      email:
        "mayank@example.com",

      phone:
        "",

      summary:
        "Recent Computer Science graduate with practical full-stack development experience and a strong foundation in software development, databases and application design. Experienced with React, Node.js, Express, MongoDB and REST APIs.",

      experience: [
        {
          id: "exp-1",

          company:
            "Oasis Infobyte",

          position:
            "Full-Stack Developer Intern",

          location:
            "Remote",

          startDate:
            "May 2024",

          endDate:
            "Jun 2024",

          bullets: [
            "Developed full-stack web applications using React, Node.js, Express and MongoDB.",
            "Implemented REST APIs and integrated frontend interfaces with backend services.",
            "Collaborated on application features, debugging and testing during the development lifecycle.",
          ],
        },
      ],

      education: [
        {
          id: "edu-1",

          institution:
            "Graphic Era Hill University",

          degree:
            "B.Tech",

          field:
            "Computer Science and Engineering",

          year:
            "2022 — 2026",

          description:
            "",
        },
      ],

      skills: [
        "C++",
        "Java",
        "Python",
        "JavaScript",
        "React.js",
        "Node.js",
        "Express.js",
        "MongoDB",
        "MySQL",
        "REST APIs",
        "Git",
        "GitHub",
      ],

      projects: [
        {
          id: "project-1",

          name:
            "PieGo",

          description:
            "Full-stack pizza ordering application built with Node.js, Express, MongoDB and Stripe.",

          technologies:
            "Node.js, Express, MongoDB, Stripe",
        },

        {
          id: "project-2",

          name:
            "InvestIQ",

          description:
            "Interactive investment-focused web application using React, Tailwind, Node.js and MongoDB.",

          technologies:
            "React, Tailwind, Node.js, MongoDB",
        },
      ],

      certifications: [
        {
          id: "cert-1",

          name:
            "Java Programming",

          issuer:
            "NPTEL · IIT Kharagpur",

          year:
            "2023",
        },

        {
          id: "cert-2",

          name:
            "Python Programming",

          issuer:
            "NPTEL",

          year:
            "2024",
        },

        {
          id: "cert-3",

          name:
            "Machine Learning I",

          issuer:
            "Columbia University",

          year:
            "2025",
        },
      ],
    },
  },

  {
    id: "resume-2",

    title:
      "Full-Stack Developer",

    fileName:
      "Mayank_Rawat_Full_Stack.pdf",

    atsScore: 79,

    version: 2,

    updatedAt:
      "2026-09-11T12:00:00.000Z",

    status:
      "Needs review",

    template:
      "professional",

    targetRole:
      "Full-Stack Developer",

    industry:
      "Technology",

    country:
      "Canada",

    experienceLevel:
      "Entry Level",

    resumeStyle:
      "Canadian Professional",
  },
];


/* =========================================================
   APPLICATION DATA
========================================================= */

const seedApplications = [
  {
    id: "app-1",

    jobId: "job-1",

    company:
      "Shopify",

    role:
      "Software Developer",

    location:
      "Toronto, ON · Remote",

    status:
      "Applied",

    appliedAt:
      "2026-09-14T12:00:00.000Z",
  },

  {
    id: "app-2",

    jobId: "job-2",

    company:
      "RBC",

    role:
      "Junior Software Engineer",

    location:
      "Toronto, ON",

    status:
      "Interview",

    appliedAt:
      "2026-09-10T12:00:00.000Z",
  },
];


/* =========================================================
   JOB DATA
========================================================= */

const jobs = [
  {
    id: "job-1",

    title:
      "Software Developer",

    company:
      "Shopify",

    location:
      "Toronto, ON · Remote",

    type:
      "Full-time",

    salary:
      "$75K–$115K CAD",

    posted:
      "2 days ago",

    industry:
      "Technology",

    tags: [
      "React",
      "Node.js",
      "JavaScript",
    ],

    applyUrl:
      "https://www.shopify.com/careers",

    description:
      "Build product experiences and services for a global commerce platform.",
  },

  {
    id: "job-2",

    title:
      "Junior Software Engineer",

    company:
      "RBC",

    location:
      "Toronto, ON",

    type:
      "Full-time",

    salary:
      "$70K–$95K CAD",

    posted:
      "3 days ago",

    industry:
      "Technology",

    tags: [
      "Java",
      "Spring Boot",
      "REST APIs",
    ],

    applyUrl:
      "https://jobs.rbc.com/ca/en",

    description:
      "Work with engineering teams to build reliable financial technology products.",
  },

  {
    id: "job-3",

    title:
      "Marketing Coordinator",

    company:
      "Canadian Retail Group",

    location:
      "Vancouver, BC · Hybrid",

    type:
      "Full-time",

    salary:
      "$50K–$65K CAD",

    posted:
      "1 day ago",

    industry:
      "Marketing & Communications",

    tags: [
      "Marketing",
      "Content",
      "Social Media",
      "Campaigns",
    ],

    applyUrl:
      "#",

    description:
      "Support marketing campaigns, content development, communications and digital initiatives.",
  },

  {
    id: "job-4",

    title:
      "Customer Service Representative",

    company:
      "Canadian Services Group",

    location:
      "Calgary, AB · On-site",

    type:
      "Full-time",

    salary:
      "$42K–$52K CAD",

    posted:
      "2 days ago",

    industry:
      "Customer Service",

    tags: [
      "Customer Service",
      "Communication",
      "CRM",
      "Support",
    ],

    applyUrl:
      "#",

    description:
      "Provide professional customer support, resolve inquiries and maintain a positive customer experience.",
  },

  {
    id: "job-5",

    title:
      "HR Coordinator",

    company:
      "Canadian Business Services",

    location:
      "Ottawa, ON · Hybrid",

    type:
      "Full-time",

    salary:
      "$52K–$68K CAD",

    posted:
      "3 days ago",

    industry:
      "Human Resources",

    tags: [
      "Recruitment",
      "HR",
      "Onboarding",
      "Employee Relations",
    ],

    applyUrl:
      "#",

    description:
      "Support recruitment, onboarding, employee documentation and day-to-day HR operations.",
  },

  {
    id: "job-6",

    title:
      "Administrative Assistant",

    company:
      "Prairie Business Solutions",

    location:
      "Winnipeg, MB",

    type:
      "Full-time",

    salary:
      "$40K–$50K CAD",

    posted:
      "4 days ago",

    industry:
      "Administration",

    tags: [
      "Administration",
      "Scheduling",
      "Documentation",
      "Office",
    ],

    applyUrl:
      "#",

    description:
      "Provide administrative support, coordinate schedules, maintain records and assist office operations.",
  },

  {
    id: "job-7",

    title:
      "Financial Analyst",

    company:
      "Canadian Financial Services",

    location:
      "Toronto, ON · Hybrid",

    type:
      "Full-time",

    salary:
      "$65K–$85K CAD",

    posted:
      "2 days ago",

    industry:
      "Business & Finance",

    tags: [
      "Finance",
      "Analysis",
      "Excel",
      "Reporting",
    ],

    applyUrl:
      "#",

    description:
      "Support financial analysis, reporting, forecasting and business decision-making.",
  },

  {
    id: "job-8",

    title:
      "Teacher Assistant",

    company:
      "Canadian Education Centre",

    location:
      "Brampton, ON",

    type:
      "Full-time",

    salary:
      "$45K–$58K CAD",

    posted:
      "5 days ago",

    industry:
      "Education",

    tags: [
      "Education",
      "Teaching",
      "Students",
      "Training",
    ],

    applyUrl:
      "#",

    description:
      "Support instructors and students with classroom activities, learning materials and educational programs.",
  },

  {
    id: "job-9",

    title:
      "Retail Sales Associate",

    company:
      "Canadian Retail Company",

    location:
      "Mississauga, ON",

    type:
      "Full-time",

    salary:
      "$38K–$48K CAD",

    posted:
      "1 day ago",

    industry:
      "Retail",

    tags: [
      "Retail",
      "Sales",
      "Customer Service",
      "Inventory",
    ],

    applyUrl:
      "#",

    description:
      "Assist customers, support store operations, maintain inventory and contribute to sales objectives.",
  },

  {
    id: "job-10",

    title:
      "Logistics Coordinator",

    company:
      "Canadian Logistics Inc.",

    location:
      "Edmonton, AB",

    type:
      "Full-time",

    salary:
      "$48K–$62K CAD",

    posted:
      "3 days ago",

    industry:
      "Transportation & Logistics",

    tags: [
      "Logistics",
      "Shipping",
      "Inventory",
      "Supply Chain",
    ],

    applyUrl:
      "#",

    description:
      "Coordinate shipments, maintain logistics records and support supply chain operations.",
  },

  {
    id: "job-11",

    title:
      "Construction Project Coordinator",

    company:
      "Western Construction Group",

    location:
      "Surrey, BC",

    type:
      "Full-time",

    salary:
      "$58K–$75K CAD",

    posted:
      "4 days ago",

    industry:
      "Construction",

    tags: [
      "Construction",
      "Project Coordination",
      "Safety",
      "Documentation",
    ],

    applyUrl:
      "#",

    description:
      "Coordinate project activities, documentation, schedules and communication across construction teams.",
  },

  {
    id: "job-12",

    title:
      "Hotel Guest Services Agent",

    company:
      "Canadian Hospitality Group",

    location:
      "Banff, AB",

    type:
      "Full-time",

    salary:
      "$40K–$52K CAD",

    posted:
      "2 days ago",

    industry:
      "Hospitality & Tourism",

    tags: [
      "Hospitality",
      "Guest Services",
      "Reservations",
      "Customer Service",
    ],

    applyUrl:
      "#",

    description:
      "Assist guests, manage reservations and provide professional service throughout the guest experience.",
  },
];


/* =========================================================
   STORAGE
========================================================= */

function readStorage(key, fallback) {
  try {
    const value =
      localStorage.getItem(key);

    return value
      ? JSON.parse(value)
      : fallback;
  } catch {
    return fallback;
  }
}


function writeStorage(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch {
    // Demo API only.
  }
}


/* =========================================================
   RESUME GENERATION
========================================================= */

function normalizePortfolio(portfolio) {
  return {
    profile:
      portfolio?.profile || {},

    experience:
      Array.isArray(portfolio?.experience)
        ? portfolio.experience
        : [],

    education:
      Array.isArray(portfolio?.education)
        ? portfolio.education
        : [],

    skills:
      Array.isArray(portfolio?.skills)
        ? portfolio.skills
        : [],

    certificates:
      Array.isArray(portfolio?.certificates)
        ? portfolio.certificates
        : [],

    projects:
      Array.isArray(portfolio?.projects)
        ? portfolio.projects
        : [],
  };
}


/* =========================================================
   INDUSTRY KEYWORDS
========================================================= */

const INDUSTRY_KEYWORDS = {
  Technology: [
    "technology",
    "software",
    "development",
    "programming",
    "engineering",
    "api",
    "database",
    "cloud",
    "testing",
    "javascript",
    "python",
    "java",
    "react",
    "node",
    "git",
  ],

  "Business & Finance": [
    "finance",
    "financial",
    "accounting",
    "analysis",
    "business",
    "budget",
    "forecast",
    "reporting",
    "excel",
    "audit",
    "operations",
    "banking",
    "investment",
  ],

  "Marketing & Communications": [
    "marketing",
    "communications",
    "content",
    "social media",
    "campaign",
    "branding",
    "seo",
    "digital marketing",
    "copywriting",
    "analytics",
    "public relations",
  ],

  Sales: [
    "sales",
    "business development",
    "customer",
    "client",
    "account",
    "revenue",
    "lead",
    "prospecting",
    "relationship",
    "negotiation",
    "crm",
  ],

  Healthcare: [
    "healthcare",
    "patient",
    "clinical",
    "medical",
    "health",
    "care",
    "records",
    "administration",
    "safety",
    "support",
  ],

  Education: [
    "education",
    "teaching",
    "training",
    "instruction",
    "student",
    "learning",
    "curriculum",
    "classroom",
    "mentoring",
    "assessment",
  ],

  Administration: [
    "administration",
    "administrative",
    "office",
    "coordination",
    "scheduling",
    "records",
    "documentation",
    "data entry",
    "organization",
    "operations",
  ],

  "Customer Service": [
    "customer service",
    "customer support",
    "client service",
    "communication",
    "problem solving",
    "support",
    "customer experience",
    "crm",
    "service",
  ],

  "Hospitality & Tourism": [
    "hospitality",
    "hotel",
    "tourism",
    "guest",
    "front desk",
    "reservation",
    "food service",
    "travel",
    "events",
    "customer service",
  ],

  Engineering: [
    "engineering",
    "design",
    "technical",
    "project",
    "manufacturing",
    "quality",
    "testing",
    "cad",
    "analysis",
    "safety",
  ],

  "Skilled Trades": [
    "trade",
    "technician",
    "maintenance",
    "repair",
    "installation",
    "equipment",
    "electrical",
    "mechanical",
    "safety",
    "inspection",
  ],

  Construction: [
    "construction",
    "site",
    "project",
    "safety",
    "building",
    "contractor",
    "equipment",
    "inspection",
    "materials",
    "blueprint",
  ],

  Retail: [
    "retail",
    "sales",
    "customer",
    "merchandising",
    "inventory",
    "cash",
    "store",
    "product",
    "service",
    "stock",
  ],

  "Human Resources": [
    "human resources",
    "hr",
    "recruitment",
    "recruiting",
    "hiring",
    "employee",
    "onboarding",
    "training",
    "payroll",
    "talent",
  ],

  Legal: [
    "legal",
    "law",
    "compliance",
    "contracts",
    "documentation",
    "research",
    "case",
    "regulatory",
    "policy",
    "administration",
  ],

  "Transportation & Logistics": [
    "logistics",
    "transportation",
    "shipping",
    "warehouse",
    "inventory",
    "supply chain",
    "delivery",
    "dispatch",
    "routing",
    "operations",
  ],

  "Government & Public Sector": [
    "government",
    "public sector",
    "administration",
    "policy",
    "compliance",
    "program",
    "community",
    "service",
    "documentation",
    "operations",
  ],

  "Non-Profit": [
    "non-profit",
    "nonprofit",
    "community",
    "fundraising",
    "volunteer",
    "outreach",
    "program",
    "advocacy",
    "events",
    "social impact",
  ],

  Other: [],
};


/* =========================================================
   SKILL NORMALIZATION
========================================================= */

function normalizeSkills(skills) {
  return skills
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      return (
        item?.name ||
        item?.skill ||
        item?.title ||
        ""
      ).trim();
    })
    .filter(Boolean);
}


/* =========================================================
   KEYWORD EXTRACTION
========================================================= */

function extractResumeKeywords(text) {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "that",
    "this",
    "from",
    "your",
    "you",
    "our",
    "will",
    "have",
    "has",
    "are",
    "was",
    "were",
    "job",
    "role",
    "work",
    "working",
    "team",
    "teams",
    "using",
    "into",
    "their",
    "they",
    "about",
    "years",
    "year",
    "must",
    "can",
    "ability",
    "required",
    "requirements",
    "responsibilities",
    "candidate",
    "candidates",
    "looking",
    "join",
    "company",
  ]);

  return [
    ...new Set(
      (text || "")
        .toLowerCase()
        .replace(
          /[^a-z0-9+#.&/\s-]/g,
          " "
        )
        .split(/\s+/)
        .map((word) =>
          word.trim()
        )
        .filter(
          (word) =>
            word.length >= 3 &&
            !stopWords.has(word)
        )
    ),
  ];
}


/* =========================================================
   SELECT RELEVANT SKILLS
========================================================= */

function selectRelevantSkills({
  skills,
  industry,
  jobDescription,
  targetRole,
}) {
  const normalizedSkills =
    normalizeSkills(skills);

  if (!normalizedSkills.length) {
    return [];
  }

  const jobText =
    `${targetRole || ""} ${
      jobDescription || ""
    } ${industry || ""}`.toLowerCase();

  const jobKeywords =
    extractResumeKeywords(jobText);

  const industryKeywords =
    INDUSTRY_KEYWORDS[industry] || [];

  return normalizedSkills
    .map((skill) => {
      const lowerSkill =
        skill.toLowerCase();

      let score = 0;

      jobKeywords.forEach(
        (keyword) => {
          if (
            lowerSkill.includes(
              keyword
            ) ||
            keyword.includes(
              lowerSkill
            )
          ) {
            score += 5;
          }
        }
      );

      industryKeywords.forEach(
        (keyword) => {
          if (
            lowerSkill.includes(
              keyword
            ) ||
            keyword.includes(
              lowerSkill
            )
          ) {
            score += 2;
          }
        }
      );

      return {
        skill,
        score,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score
    )
    .map(
      (item) =>
        item.skill
    )
    .slice(0, 14);
}


/* =========================================================
   PROFESSIONAL SUMMARY
========================================================= */

function createProfessionalSummary({
  profile,
  targetRole,
  industry,
  experienceLevel,
  skills,
  jobDescription,
}) {
  const role =
    targetRole ||
    profile.title ||
    "professional";

  const level =
    experienceLevel ||
    "Entry Level";

  const skillText =
    skills
      .slice(0, 5)
      .join(", ");

  const jobKeywords =
    extractResumeKeywords(
      jobDescription
    )
      .slice(0, 4)
      .join(", ");

  let opening;

  if (
    level ===
    "Student / Recent Graduate"
  ) {
    opening =
      "Recent graduate with a strong foundation and practical experience";
  } else if (
    level ===
    "Career Change"
  ) {
    opening =
      "Professional transitioning into a new career path with transferable skills and practical experience";
  } else {
    opening =
      "Professional with hands-on experience";
  }

  const industryText =
    industry &&
    industry !== "Other"
      ? ` in ${industry.toLowerCase()}`
      : "";

  let summary =
    `${opening}${industryText}, targeting ${role} opportunities.`;

  if (skillText) {
    summary +=
      ` Brings experience with ${skillText}.`;
  }

  if (jobKeywords) {
    summary +=
      ` Relevant strengths include ${jobKeywords}.`;
  }

  summary +=
    " Adaptable, organized and focused on contributing effectively while continuing to develop professionally.";

  return summary;
}


/* =========================================================
   EXPERIENCE BULLETS
========================================================= */

function createExperienceBullets(
  item,
  industry,
  targetRole
) {
  const description =
    item.description ||
    item.details ||
    item.responsibilities ||
    "";

  const existingBullets =
    Array.isArray(item.bullets)
      ? item.bullets
      : [];

  const bullets = [
    ...existingBullets,
  ];

  if (
    description &&
    !bullets.includes(description)
  ) {
    bullets.push(description);
  }

  if (!bullets.length) {
    const position =
      item.position ||
      item.role ||
      item.title ||
      targetRole ||
      "professional";

    bullets.push(
      `Contributed to ${position.toLowerCase()} responsibilities while supporting day-to-day team objectives and maintaining professional standards.`
    );

    if (industry) {
      bullets.push(
        `Applied relevant knowledge and transferable skills to support activities within the ${industry.toLowerCase()} environment.`
      );
    }
  }

  return bullets
    .map((bullet) =>
      typeof bullet === "string"
        ? bullet.trim()
        : String(bullet)
    )
    .filter(Boolean)
    .slice(0, 5);
}


/* =========================================================
   CREATE RESUME CONTENT
========================================================= */

function createResumeContent({
  portfolio,
  targetRole,
  industry,
  jobDescription,
  experienceLevel,
}) {
  const {
    profile,
    experience,
    education,
    certificates,
    projects,
  } =
    normalizePortfolio(
      portfolio
    );

  const skills =
    normalizeSkills(
      portfolio?.skills || []
    );

  const relevantSkills =
    selectRelevantSkills({
      skills,
      industry,
      jobDescription,
      targetRole,
    });

  const finalSkills =
    relevantSkills.length
      ? relevantSkills
      : skills.slice(0, 14);

  return {
    name:
      profile.name ||
      "Your Name",

    title:
      targetRole ||
      profile.title ||
      "Professional",

    location:
      profile.location ||
      "",

    email:
      profile.email ||
      "",

    phone:
      profile.phone ||
      "",

    summary:
      createProfessionalSummary({
        profile,
        targetRole,
        industry,
        experienceLevel,
        skills: finalSkills,
        jobDescription,
      }),

    experience:
      experience.map(
        (item, index) => ({
          id:
            item._id ||
            `exp-${index}`,

          company:
            item.company ||
            item.organization ||
            "",

          position:
            item.position ||
            item.role ||
            item.title ||
            "",

          location:
            item.location ||
            "",

          startDate:
            item.startDate ||
            item.startYear ||
            "",

          endDate:
            item.endDate ||
            item.endYear ||
            "",

          bullets:
            createExperienceBullets(
              item,
              industry,
              targetRole
            ),
        })
      ),

    education:
      education.map(
        (item, index) => ({
          id:
            item._id ||
            `edu-${index}`,

          institution:
            item.institution ||
            item.school ||
            "",

          degree:
            item.degree ||
            item.program ||
            "",

          field:
            item.fieldOfStudy ||
            item.field ||
            "",

          year:
            item.year ||
            "",

          description:
            item.description ||
            "",
        })
      ),

    skills:
      finalSkills,

    projects:
      projects.map(
        (item, index) => ({
          id:
            item._id ||
            item.id ||
            `project-${index}`,

          name:
            item.name ||
            item.title ||
            "",

          description:
            item.description ||
            "",

          technologies:
            item.technologies ||
            item.techStack ||
            "",
        })
      ),

    certifications:
      certificates.map(
        (item, index) => ({
          id:
            item._id ||
            `cert-${index}`,

          name:
            item.name ||
            item.title ||
            "",

          issuer:
            item.issuer ||
            item.provider ||
            "",

          year:
            item.year ||
            "",
        })
      ),
  };
}


/* =========================================================
   BUILD RESUME API
========================================================= */

export async function buildMockResume(
  payload = {}
) {
  await wait(900);

  const targetRole =
    payload.targetRole?.trim();

  if (!targetRole) {
    throw new Error(
      "Please enter a target job title."
    );
  }

  const industry =
    payload.industry ||
    "Other";

  const country =
    payload.country ||
    "Canada";

  const experienceLevel =
    payload.experienceLevel ||
    "Entry Level";

  const jobDescription =
    payload.jobDescription?.trim() ||
    "";

  const resumeStyle =
    payload.resumeStyle ||
    "Canadian Professional";

  const content =
    createResumeContent({
      portfolio:
        payload.portfolio,

      targetRole,

      industry,

      jobDescription,

      experienceLevel,
    });

  const resume = {
    id:
      `resume-${Date.now()}`,

    title:
      `${targetRole} Resume`,

    fileName:
      "WestForce_Resume.pdf",

    atsScore:
      84,

    version:
      1,

    updatedAt:
      new Date().toISOString(),

    status:
      "AI generated",

    template:
      "professional",

    targetRole,

    industry,

    country,

    experienceLevel,

    resumeStyle,

    jobDescription,

    format: {
      country:
        "Canada",

      style:
        resumeStyle,

      atsFriendly:
        true,

      photo:
        false,

      dateOfBirth:
        false,

      maritalStatus:
        false,

      sin:
        false,
    },

    content,
  };

  return {
    success:
      true,

    resume,
  };
}


/* =========================================================
   ENHANCE RESUME API
========================================================= */

export async function enhanceResume(
  payload = {}
) {
  await wait(1100);

  const targetRole =
    payload.targetRole?.trim() ||
    payload.portfolio?.profile?.title ||
    "Professional";

  const industry =
    payload.industry ||
    "Other";

  const country =
    payload.country ||
    "Canada";

  const experienceLevel =
    payload.experienceLevel ||
    "Entry Level";

  const jobDescription =
    payload.jobDescription?.trim() ||
    "";

  const resumeStyle =
    payload.resumeStyle ||
    "Canadian Professional";

  const content =
    createResumeContent({
      portfolio:
        payload.portfolio,

      targetRole,

      industry,

      jobDescription,

      experienceLevel,
    });

  content.experience =
    content.experience.map(
      (experience) => ({
        ...experience,

        bullets:
          experience.bullets.map(
            (bullet) => {
              const clean =
                bullet
                  .replace(
                    /^developed and contributed to\s+/i,
                    ""
                  )
                  .trim();

              return (
                clean.charAt(0).toUpperCase() +
                clean.slice(1)
              );
            }
          ),
      })
    );

  const resume = {
    id:
      `resume-${Date.now()}`,

    title:
      `${targetRole} Resume · Enhanced`,

    fileName:
      payload.fileName ||
      "WestForce_Enhanced_Resume.pdf",

    atsScore:
      88,

    version:
      1,

    updatedAt:
      new Date().toISOString(),

    status:
      "AI enhanced",

    template:
      "professional",

    targetRole,

    industry,

    country,

    experienceLevel,

    resumeStyle,

    jobDescription,

    sourceFileUrl:
      payload.fileUrl ||
      "",

    format: {
      country:
        "Canada",

      style:
        resumeStyle,

      atsFriendly:
        true,

      photo:
        false,

      dateOfBirth:
        false,

      maritalStatus:
        false,

      sin:
        false,
    },

    content,
  };

  const improvements = [];

  const options =
    Array.isArray(
      payload.options
    )
      ? payload.options
      : [];

  if (
    options.includes("summary")
  ) {
    improvements.push(
      "Improved professional summary"
    );
  }

  if (
    options.includes("experience")
  ) {
    improvements.push(
      "Strengthened experience descriptions"
    );
  }

  if (
    options.includes("keywords")
  ) {
    improvements.push(
      "Improved job-specific keyword alignment"
    );
  }

  if (
    options.includes("ats")
  ) {
    improvements.push(
      "Improved ATS-friendly structure"
    );
  }

  if (
    options.includes("projects")
  ) {
    improvements.push(
      "Improved project descriptions"
    );
  }

  if (
    options.includes("rewrite")
  ) {
    improvements.push(
      "Improved clarity and professional wording"
    );
  }

  if (!improvements.length) {
    improvements.push(
      "Improved overall resume structure"
    );
  }

  return {
    success:
      true,

    title:
      resume.title,

    scoreBefore:
      72,

    scoreAfter:
      88,

    summary:
      `Your resume has been improved for ${targetRole} opportunities using a Canadian-style, ATS-friendly structure.`,

    improvements,

    resume,
  };
}


/* =========================================================
   SAVE RESUME
========================================================= */

export async function saveMockResume(
  payload
) {
  await wait(400);

  const resumes =
    readStorage(
      STORAGE.resumes,
      seedResumes
    );

  const resume = {
    ...payload,

    id:
      payload.id ||
      `resume-${Date.now()}`,

    updatedAt:
      new Date().toISOString(),
  };

  const existingIndex =
    resumes.findIndex(
      (item) =>
        item.id === resume.id
    );

  let next;

  if (existingIndex >= 0) {
    next = [...resumes];

    next[existingIndex] =
      resume;
  } else {
    next = [
      resume,
      ...resumes,
    ];
  }

  writeStorage(
    STORAGE.resumes,
    next
  );

  return resume;
}


/* =========================================================
   GET RESUMES
========================================================= */

export async function getMockResumes() {
  await wait(350);

  return readStorage(
    STORAGE.resumes,
    seedResumes
  );
}


/* =========================================================
   ATS CHECK
========================================================= */

function extractKeywords(text) {
  const stopWords =
    new Set([
      "the",
      "and",
      "for",
      "with",
      "that",
      "this",
      "from",
      "your",
      "you",
      "are",
      "our",
      "will",
      "have",
      "has",
      "job",
      "role",
      "work",
      "team",
      "using",
      "into",
      "their",
      "they",
      "about",
      "years",
      "must",
      "can",
      "candidate",
      "candidates",
      "required",
      "requirements",
      "responsibilities",
    ]);

  return [
    ...new Set(
      (text || "")
        .toLowerCase()
        .replace(
          /[^a-z0-9+#.\s-]/g,
          " "
        )
        .split(/\s+/)
        .filter(
          (word) =>
            word.length >= 3 &&
            !stopWords.has(word)
        )
    ),
  ].slice(0, 80);
}


export async function checkATSResume({
  resumeText = "",
  jobDescription = "",
}) {
  await wait(900);

  const resumeWords =
    new Set(
      extractKeywords(
        resumeText
      )
    );

  const jobKeywords =
    extractKeywords(
      jobDescription
    );

  const matched =
    jobKeywords.filter(
      (word) =>
        resumeWords.has(word)
    );

  const missing =
    jobKeywords
      .filter(
        (word) =>
          !resumeWords.has(word)
      )
      .slice(0, 12);

  const keywordScore =
    jobKeywords.length
      ? Math.round(
          (matched.length /
            jobKeywords.length) *
            100
        )
      : 78;

  const score =
    Math.min(
      96,
      Math.max(
        54,
        Math.round(
          keywordScore * 0.55 +
            72 * 0.45
        )
      )
    );

  return {
    score,

    keywordMatch:
      keywordScore,

    matchedKeywords:
      matched.slice(0, 16),

    missingKeywords:
      missing,

    sections: {
      structure:
        92,

      readability:
        88,

      experience:
        84,

      skills:
        keywordScore,

      formatting:
        91,
    },

    recommendations: [
      missing.length
        ? `Consider naturally adding: ${missing
            .slice(0, 5)
            .join(", ")}.`
        : "Your keyword coverage is strong for this job description.",

      "Use measurable outcomes in at least three experience bullets.",

      "Keep headings simple so ATS systems can identify each section.",

      "Avoid tables, text boxes and decorative elements in the ATS version.",
    ],
  };
}


/* =========================================================
   JOB API
========================================================= */

export async function getMockJobs(
  filters = {}
) {
  await wait(450);

  const query =
    (
      filters.query ||
      ""
    )
      .trim()
      .toLowerCase();

  const industry =
    (
      filters.industry ||
      ""
    )
      .trim()
      .toLowerCase();

  return jobs.filter(
    (job) => {
      const searchableText = [
        job.title,
        job.company,
        job.location,
        job.industry,
        job.type,
        job.description,
        ...job.tags,
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery =
        !query ||
        searchableText.includes(
          query
        );

      const matchesIndustry =
        !industry ||
        job.industry
          ?.toLowerCase()
          .includes(industry);

      return (
        matchesQuery &&
        matchesIndustry
      );
    }
  );
}


/* =========================================================
   APPLICATION API
========================================================= */

export async function getMockApplications() {
  await wait(350);

  return readStorage(
    STORAGE.applications,
    seedApplications
  );
}


/* =========================================================
   SAVE APPLICATION
========================================================= */

export async function saveMockApplication(
  job
) {
  await wait(350);

  const applications =
    readStorage(
      STORAGE.applications,
      seedApplications
    );

  const existing =
    applications.find(
      (item) =>
        item.jobId === job.id
    );

  if (existing) {
    return existing;
  }

  const application = {
    id:
      `app-${Date.now()}`,

    jobId:
      job.id,

    company:
      job.company,

    role:
      job.title,

    location:
      job.location,

    status:
      "Saved",

    appliedAt:
      null,
  };

  writeStorage(
    STORAGE.applications,
    [
      application,
      ...applications,
    ]
  );

  return application;
}


/* =========================================================
   DASHBOARD API
========================================================= */

export async function getMockDashboardData() {
  await wait(350);

  const resumes =
    readStorage(
      STORAGE.resumes,
      seedResumes
    );

  const applications =
    readStorage(
      STORAGE.applications,
      seedApplications
    );

  return {
    stats: {
      resumes:
        resumes.length,

      applications:
        applications.length,

      interviews:
        applications.filter(
          (item) =>
            item.status ===
            "Interview"
        ).length,

      savedJobs:
        applications.filter(
          (item) =>
            item.status ===
            "Saved"
        ).length,
    },

    recentResumes:
      resumes.slice(0, 3),

    recentApplications:
      applications.slice(0, 5),

    recommendedJobs:
      jobs.slice(0, 6),
  };
}


/* =========================================================
   CERTIFICATES API
========================================================= */

const seedCertificates = [
  {
    id:
      "cert-1",

    name:
      "Java Programming",

    issuer:
      "NPTEL · IIT Kharagpur",

    year:
      "2023",

    status:
      "Verified",
  },

  {
    id:
      "cert-2",

    name:
      "Python Programming",

    issuer:
      "NPTEL",

    year:
      "2024",

    status:
      "Verified",
  },

  {
    id:
      "cert-3",

    name:
      "Machine Learning I",

    issuer:
      "Columbia University",

    year:
      "2025",

    status:
      "Verified",
  },
];


export async function getMockCertificates() {
  await wait(350);

  return seedCertificates;
}


/* =========================================================
   UPDATE APPLICATION STATUS API
========================================================= */

export async function updateMockApplicationStatus(
  applicationId,
  status
) {
  await wait(350);

  const applications =
    readStorage(
      STORAGE.applications,
      seedApplications
    );

  const index =
    applications.findIndex(
      (item) =>
        item.id ===
        applicationId
    );

  if (index === -1) {
    throw new Error(
      "Application not found."
    );
  }

  const updatedApplication = {
    ...applications[index],

    status,
  };

  const updatedApplications =
    [
      ...applications,
    ];

  updatedApplications[index] =
    updatedApplication;

  writeStorage(
    STORAGE.applications,
    updatedApplications
  );

  return updatedApplication;
}