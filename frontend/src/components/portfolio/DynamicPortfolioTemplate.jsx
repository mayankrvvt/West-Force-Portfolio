import React, { useState } from "react";

import { formatDate } from "../../utils/formatDate";
import PortfolioSidebar from "./PortfolioSidebar.jsx";
import PortfolioHero from "./PortfolioHero.jsx";
import PortfolioContactBar from "./PortfolioContactBar.jsx";
import AboutSection from "./AboutSection.jsx";
import CertificatesSection from "./CertificatesSection.jsx";
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

function listOf(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

const JOB_TYPE_WORDS = {
  full_time: "full time",
  part_time: "part time",
  casual: "casual",
};

const LANGUAGE_NAMES = { en: "English", fr: "French" };

/* "a", "a and b", "a, b and c" */
function joinWords(words, last = "and") {
  if (words.length <= 1) return words[0] || "";
  return `${words.slice(0, -1).join(", ")} ${last} ${words.at(-1)}`;
}

function sentenceCase(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "";
}

function startText(value) {
  if (value === "now") return "Can start now";

  // Noon keeps a date only value on the same day in every time zone
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? formatDate(`${value}T12:00:00`)
    : "";

  return date ? `Can start ${date}` : "";
}

function isCertificate(document) {
  return /certific/i.test(String(document?.type || ""));
}

function mapPortfolioData(portfolio) {
  const profile = portfolio?.profile || {};
  const hero = portfolio?.hero || {};
  const about = portfolio?.about || {};

  return {
    // --------------------------------------------------
    // DOCUMENT PROTECTION
    // --------------------------------------------------
    documentProtection: {
      enabled:
        portfolio?.documentProtection?.enabled === true,
      pinLength:
        portfolio?.documentProtection?.pinLength || null,
    },

    // --------------------------------------------------
    // PROFILE
    // --------------------------------------------------
    profile: {
      name: profile.name || "",
      title: profile.title || "",
      headline: profile.title || "",
      location: profile.location || "",
      email: profile.email || "",
      phone: profile.phone || "",

      image:
        [profile.imageUrl, profile.image].find(
          (imageUrl) =>
            typeof imageUrl === "string" &&
            imageUrl.trim() &&
            !imageUrl.startsWith("blob:")
        ) || "",

      available:
        profile.availableForWork !== false,

      // Hire facts for the header band (all optional)
      availability: {
        jobTypes: listOf(profile.availability?.jobTypes),
        shifts: listOf(profile.availability?.shifts),
        startDate: profile.availability?.startDate || "",
      },
      workArea: String(profile.workArea || "").trim(),
      travel: {
        willing: profile.travel?.willing === true,
        ownCar: profile.travel?.ownCar === true,
      },
      languages: listOf(profile.languages),
      driversLicence: String(profile.driversLicence || "").trim(),
    },

    // --------------------------------------------------
    // HERO
    // --------------------------------------------------
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

    // --------------------------------------------------
    // ABOUT
    // --------------------------------------------------
    about: {
      title:
        // Older portfolios saved "About Me"; show them in sentence case.
        (about.title && about.title !== "About Me"
          ? about.title
          : "About me"),

      description:
        about.description ||
        "",

      videoUrl:
        about.videoUrl ||
        about.video?.url ||
        "",

      video:
        about.video && typeof about.video === "object"
          ? {
              url: about.video.url || "",
              title:
                about.video.title ||
                "Video introduction",
              description:
                about.video.description ||
                "A short introduction in my own words.",
              poster:
                about.video.poster ||
                "",
            }
          : {
              url:
                about.videoUrl ||
                about.video?.url ||
                "",
              title: "Video introduction",
              description:
                "A short introduction in my own words.",
              poster: about.poster || "",
            },

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

    // --------------------------------------------------
    // EXPERIENCE
    // --------------------------------------------------
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

          startDate:
            item.startDate ||
            "",

          endDate:
            item.endDate ||
            "",

          isCurrent:
            item.isCurrent === true ||
            (!item.endDate && !item.duration && Boolean(item.startDate)),

          location:
            item.location ||
            "",

          description:
            item.description ||
            "",
        }))
      : [],

    // --------------------------------------------------
    // EDUCATION
    // --------------------------------------------------
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

    // --------------------------------------------------
    // SKILLS
    // --------------------------------------------------
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

    // --------------------------------------------------
    // DOCUMENTS
    // --------------------------------------------------
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

    // --------------------------------------------------
    // RESUME
    // --------------------------------------------------
    resume: {
      name:
        portfolio.resume?.name ||
        "Resume",

      url:
        portfolio.resume?.fileUrl
          ? portfolio.status === "published" && portfolio.slug
            ? `/api/portfolios/${encodeURIComponent(portfolio.slug)}/resume`
            : portfolio.resume.fileUrl
          : portfolio.resume?.url || "",
    },
  };
}

/*
 * What an employer needs to decide on a call: when, where, languages,
 * licence and the key certificate. Empty when the candidate set none.
 */
function buildHireFacts(data) {
  const { availability, workArea, travel, languages, driversLicence } =
    data.profile;
  const facts = [];

  const when = [
    joinWords(
      availability.jobTypes.map((type) => JOB_TYPE_WORDS[type]).filter(Boolean),
      "or"
    ),
    joinWords(availability.shifts),
  ].filter(Boolean);
  const start = startText(availability.startDate);

  if (when.length || start) {
    facts.push({
      label: "Availability",
      value: when.length ? sentenceCase(when.join(", ")) : start,
      note: when.length ? start : "",
    });
  }

  const travelText = sentenceCase(
    [travel.willing && "willing to travel", travel.ownCar && "has own car"]
      .filter(Boolean)
      .join(", ")
  );

  if (workArea || travelText) {
    facts.push({
      label: "Area",
      value: workArea || travelText,
      note: workArea ? travelText : "",
    });
  }

  const languageNames = languages
    .map((code) => LANGUAGE_NAMES[code])
    .filter(Boolean);

  if (languageNames.length) {
    facts.push({ label: "Languages", value: joinWords(languageNames) });
  }

  if (driversLicence) {
    facts.push({
      label: "Driver's licence",
      // "G" or "AZ" reads better as "Class G"
      value: /^[a-z]{1,2}\d?$/i.test(driversLicence)
        ? `Class ${driversLicence.toUpperCase()}`
        : driversLicence,
    });
  }

  // Only add the certificate when the candidate set other hire facts, so
  // older portfolios keep their full set of facts below.
  const certificate = data.documents.find(isCertificate);

  if (facts.length && certificate) {
    facts.push({ label: "Key certificate", value: certificate.name });
  }

  return facts;
}

/* Short facts for the header strip, so an employer can scan the basics. */
function buildFacts(data) {
  const hireFacts = buildHireFacts(data);

  if (hireFacts.length) return hireFacts;

  const facts = [];

  const current =
    data.experience.find((item) => item.isCurrent) ||
    data.experience[0];

  if (current?.position) {
    facts.push({
      label: current.isCurrent ? "Current role" : "Latest role",
      value: current.company
        ? `${current.position}, ${current.company}`
        : current.position,
    });
  }

  const startYears = data.experience
    .map((item) => parseInt(String(item.startDate).slice(0, 4), 10))
    .filter((year) => year > 1950 && year < 2100);

  if (startYears.length) {
    const roles = data.experience.length;
    facts.push({
      label: "Experience",
      value: `Since ${Math.min(...startYears)}, ${roles} ${
        roles === 1 ? "role" : "roles"
      }`,
    });
  }

  const latestEducation = data.education.find((item) => item.degree);

  if (latestEducation) {
    facts.push({
      label: "Education",
      value: latestEducation.institution
        ? `${latestEducation.degree}, ${latestEducation.institution}`
        : latestEducation.degree,
    });
  }

  if (data.documents.length) {
    const count = data.documents.length;
    facts.push({
      label: "Documents",
      value: `${count} ${count === 1 ? "file" : "files"}`,
    });
  }

  return facts.slice(0, 4);
}

/*
 * `contactBar` adds the phone contact bar. Only the public page sets it: the
 * bar is fixed to the screen, so it must not show inside the dashboard preview.
 */
export default function DynamicPortfolioTemplate({
  portfolio,
  contactBar = false,
}) {
  // The hero "Watch intro" button and the About video share one player
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  if (!portfolio) {
    return null;
  }

  const data = mapPortfolioData(portfolio);
  const hasResume = Boolean(data.resume.url && data.resume.url !== "#");
  const resumeUrl = hasResume ? data.resume.url : "";
  const hasDocuments = data.documents.length > 0;
  const certificates = data.documents.filter(isCertificate);
  const videoUrl = String(data.about.video?.url || "").trim();
  const hasVideo = Boolean(videoUrl && !videoUrl.startsWith("pending:"));
  const hasAbout = Boolean(data.about.description || hasVideo);

  // Only link to sections that are on the page
  const sectionIds = [
    hasAbout && "about",
    certificates.length > 0 && "certificates",
    data.experience.length > 0 && "experience",
    data.skills.length > 0 && "skills",
    data.education.length > 0 && "education",
    hasDocuments && "documents",
    hasResume && "resume",
  ].filter(Boolean);

  return (
    <div
      className={`public-portfolio ${contactBar ? "has-contact-bar" : ""}`}
    >

      {/* TOP BAR: logo, name and section links */}
      <PortfolioSidebar
        profile={data.profile}
        sectionIds={sectionIds}
        resumeUrl={resumeUrl}
      />

      {/* IDENTITY HEADER */}
      <PortfolioHero
        data={data.hero}
        profile={data.profile}
        facts={buildFacts(data)}
        resumeUrl={resumeUrl}
        onWatchIntro={hasVideo ? () => setIsVideoOpen(true) : null}
      />

      {/* MAIN CONTENT */}
      <main className="portfolio-main">

        {hasAbout && (
          <AboutSection
            data={data.about}
            isVideoOpen={isVideoOpen}
            onVideoOpenChange={setIsVideoOpen}
          />
        )}

        {/* Names are public; the files stay behind the PIN in Documents */}
        {certificates.length > 0 && (
          <CertificatesSection
            data={certificates}
            protectionEnabled={data.documentProtection.enabled}
          />
        )}

        {data.experience.length > 0 && (
          <ExperienceSection
            data={data.experience}
          />
        )}

        {data.skills.length > 0 && (
          <SkillsSection
            data={data.skills}
          />
        )}

        {data.education.length > 0 && (
          <EducationSection
            data={data.education}
          />
        )}

        {/* Employers never see empty Resume or Documents blocks */}
        {hasDocuments ? (
          <DocumentsSection
            data={data.documents}
            portfolioSlug={portfolio.slug}
            protectionEnabled={
              data.documentProtection.enabled
            }
            pinLength={data.documentProtection.pinLength}
            candidateName={data.profile.name}
            candidateEmail={data.profile.email}
          />
        ) : (
          <p className="portfolio-quiet-note">
            No documents are shared on this portfolio yet.
          </p>
        )}

        {hasResume && (
          <ResumeSection
            data={data.resume}
          />
        )}
      </main>

      <footer className="portfolio-footer">
        <p>
          © {new Date().getFullYear()}{" "}
          {data.profile.name ||
            "Candidate"}
        </p>

        <p className="portfolio-footer-brand">
          <img src="/favicon.png" alt="" width="20" height="20" />
          Portfolio hosted by WestForce
        </p>
      </footer>

      {contactBar && (
        <PortfolioContactBar
          name={data.profile.name}
          email={data.profile.email}
          phone={data.profile.phone}
          resumeUrl={resumeUrl}
        />
      )}
    </div>
  );
}