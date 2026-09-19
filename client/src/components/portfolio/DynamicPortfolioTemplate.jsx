import React from "react";

import PortfolioSidebar from "./PortfolioSidebar.jsx";
import PortfolioHero from "./PortfolioHero.jsx";
import AboutSection from "./AboutSection.jsx";
import ExperienceSection from "./ExperienceSection.jsx";
import EducationSection from "./EducationSection.jsx";
import SkillsSection from "./SkillsSection.jsx";
import DocumentsSection from "./DocumentsSection.jsx";
import ResumeSection from "./ResumeSection.jsx";

function formatFileSize(bytes) {
  const value = Number(bytes);

  if (!value || value <= 0) {
    return "";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function mapPortfolioData(portfolio) {
  const profile = portfolio?.profile || {};
  const hero = portfolio?.hero || {};
  const about = portfolio?.about || {};

  return {
    profile: {
      name: profile.name || "",
      title: profile.title || "",
      headline: profile.title || "",
      location: profile.location || "",
      email: profile.email || "",
      phone: profile.phone || "",
      image:
        profile.imageUrl ||
        profile.image ||
        "",
      available:
        profile.availableForWork !== false,
    },

    hero: {
      greeting:
        hero.greeting ||
        "Hello, I'm",

      name:
        profile.name ||
        "",

      headline:
        hero.headline ||
        profile.title ||
        "",

      description:
        hero.description ||
        "",
    },

    about: {
      title:
        about.title ||
        "About Me",

      description:
        about.description ||
        "",

      videoUrl:
        about.videoUrl ||
        "",

      details: [
        profile.location
          ? {
              label: "Location",
              value: profile.location,
            }
          : null,

        portfolio.experience?.length
          ? {
              label: "Experience",
              value: `${portfolio.experience.length} ${
                portfolio.experience.length === 1
                  ? "Position"
                  : "Positions"
              }`,
            }
          : null,

        profile.availableForWork
          ? {
              label: "Availability",
              value: "Available",
            }
          : null,

        profile.email
          ? {
              label: "Email",
              value: profile.email,
            }
          : null,
      ].filter(Boolean),
    },

    experience: Array.isArray(portfolio.experience)
      ? portfolio.experience.map((item) => ({
          company: item.company || "",
          position:
            item.position ||
            item.title ||
            "",
          duration:
            item.duration ||
            item.year ||
            "",
          location:
            item.location ||
            "",
          description:
            item.description ||
            "",
        }))
      : [],

    education: Array.isArray(portfolio.education)
      ? portfolio.education.map((item) => ({
          institution:
            item.institution ||
            "",
          degree:
            item.degree ||
            "",
          fieldOfStudy:
            item.fieldOfStudy ||
            "",
          year:
            item.year ||
            "",
          description:
            item.description ||
            "",
        }))
      : [],

    skills: Array.isArray(portfolio.skills)
      ? portfolio.skills.map((skill) => {
          if (typeof skill === "string") {
            return skill;
          }

          return {
            name: skill.name || "",
            level: skill.level || "",
          };
        })
      : [],

    documents: Array.isArray(portfolio.documents)
  ? portfolio.documents.map((document) => ({
      _id: document._id || "",

      name:
        document.name ||
        "Document",

      type:
        document.type ||
        document.format ||
        "Document",

      size:
        document.size
          ? formatFileSize(
              document.size
            )
          : "",

      /*
       * DO NOT use these for the
       * public document View.
       *
       * The backend protects access.
       */
      url: "",

      publicId: "",

      resourceType:
        document.resourceType ||
        "",

      format:
        document.format ||
        "",

      protected:
        document.protected !== false,
    }))
  : [],

    resume: {
      name:
        portfolio.resume?.name ||
        "Resume",

      url:
        portfolio.resume?.fileUrl ||
        portfolio.resume?.url ||
        "",
    },
  };
}

export default function DynamicPortfolioTemplate({
  portfolio,
}) {
  if (!portfolio) {
    return null;
  }

  const data = mapPortfolioData(portfolio);

  return (
    <div className="public-portfolio">

      {/* SIDEBAR */}

      <PortfolioSidebar
        profile={data.profile}
      />

      {/* MAIN CONTENT */}

      <main className="portfolio-main">

        {/* HERO */}

        <PortfolioHero
          data={data.hero}
          profile={data.profile}
        />

        {/* ABOUT */}

        <AboutSection
          data={data.about}
        />

        {/* EXPERIENCE */}

        <ExperienceSection
          data={data.experience}
        />

        {/* EDUCATION */}

        <EducationSection
          data={data.education}
        />

        {/* SKILLS */}

        <SkillsSection
          data={data.skills}
        />

        {/* DOCUMENTS */}

        <DocumentsSection
          data={data.documents}
        />

        {/* RESUME */}

        <ResumeSection
          data={data.resume}
        />

        {/* FOOTER */}

        <footer className="portfolio-footer">
          <p>
            © {new Date().getFullYear()}{" "}
            {data.profile.name ||
              "Candidate"}
          </p>

          <span>
            Powered by WestForce
          </span>
        </footer>

      </main>
    </div>
  );
}