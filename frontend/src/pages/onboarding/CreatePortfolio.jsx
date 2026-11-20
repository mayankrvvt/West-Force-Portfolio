import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "../../utils/api";
import { auth } from "../../firebase/firebase";
import { DEMO_MODE, getDemoSessionUser } from "../../demo/demoMode";

// In demo mode there is no Firebase session, so use the demo user instead.
const currentUser = () => (DEMO_MODE ? getDemoSessionUser() : auth.currentUser);
import "../../styles/onboarding.css";

import {
  ArrowLeft,
  ShieldCheck,
  Award,
  BriefcaseBusiness,
  Check,
  FileText,
  Globe,
  GraduationCap,
  ImagePlus,
  PlayCircle,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";

const STORAGE_KEY = "westforce_portfolio_draft";
const STEP_STORAGE_KEY = "westforce_portfolio_step";

const emptyPortfolio = {
  slug: "",
  status: "draft",
  template: "default",

  profile: {
    name: "",
    title: "",
    location: "",
    email: "",
    phone: "",
    imageUrl: "",
    availableForWork: true,

    // Hire facts shown at the top of the portfolio (all optional)
    availability: {
      jobTypes: [],
      shifts: [],
      startDate: "",
    },
    workArea: "",
    travel: { willing: false, ownCar: false },
    languages: [],
    driversLicence: "",
  },

  hero: {
    greeting: "Hello, I'm",
    headline: "",
    description: "",
  },

  about: {
    title: "About me",
    description: "",
    videoUrl: "",
    videoPublicId: "",
    videoStatus: "",
  },

  experience: [],

  education: [],

  skills: [],

  documents: [],

  documentProtection: {
    enabled: false,
    pin: "",
  },

  resume: {
    name: "",
    fileUrl: "",
  },

  socialLinks: {
    linkedin: "",
    github: "",
    website: "",
    instagram: "",
  },
};

const steps = [
  {
    id: "profile",
    label: "Profile",
    icon: UserRound,
  },
  {
    id: "hero",
    label: "Headline",
    icon: PlayCircle,
  },
  {
    id: "about",
    label: "About",
    icon: FileText,
  },
  {
    id: "experience",
    label: "Experience",
    icon: BriefcaseBusiness,
  },
  {
    id: "education",
    label: "Education",
    icon: GraduationCap,
  },
  {
    id: "skills",
    label: "Skills",
    icon: Award,
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
  },
  {
    id: "resume",
    label: "Resume",
    icon: FileText,
  },
  {
    id: "social",
    label: "Social links",
    icon: Globe,
  },
  {
    id: "review",
    label: "Review",
    icon: Check,
  },
];

const sectionCopy = {
  profile: {
    title: "Tell employers who you are",
    description:
      "Your name, the job you do and the link people will open. You can change these later.",
  },

  hero: {
    title: "Write your headline",
    description:
      "The first lines employers read at the top of your portfolio. Keep it short and plain.",
  },

  about: {
    title: "Tell your story",
    description:
      "A few lines about your work and what you are looking for. A short intro video is optional.",
  },

  experience: {
    title: "Add your work experience",
    description:
      "Start with your most recent job. A line or two about each role is enough.",
  },

  education: {
    title: "Add your education",
    description:
      "Your diploma, degree or certificate program, and where you studied.",
  },

  skills: {
    title: "Highlight your skills",
    description:
      "Pick the skills you want employers to notice first.",
  },

  documents: {
    title: "Add your certificates",
    description:
      "Certificates, licences and awards. Turn on a PIN so only people you trust can open them.",
  },

  resume: {
    title: "Add your resume",
    description:
      "Upload the resume employers can download from your portfolio.",
  },

  social: {
    title: "Add your profiles",
    description:
      "Links like LinkedIn help employers learn more about you. Add at least one.",
  },

  review: {
    title: "Check everything over",
    description:
      "Here is what you entered. Fix anything that is missing, then finish to open your dashboard.",
  },
};

function readDraft() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return emptyPortfolio;
    }

    const parsed = JSON.parse(raw);

    return {
      ...emptyPortfolio,
      ...parsed,

      profile: {
        ...emptyPortfolio.profile,
        ...(parsed.profile || {}),
        imageUrl: parsed.profile?.imageUrl?.startsWith("blob:")
          ? ""
          : parsed.profile?.imageUrl || "",
      },

      hero: {
        ...emptyPortfolio.hero,
        ...(parsed.hero || {}),
      },

      about: {
        ...emptyPortfolio.about,
        ...(parsed.about || {}),
      },

      resume: {
        ...emptyPortfolio.resume,
        ...(parsed.resume || {}),
      },

      socialLinks: {
        ...emptyPortfolio.socialLinks,
        ...(parsed.socialLinks || {}),
      },

      experience: parsed.experience || [],
      education: parsed.education || [],
      skills: parsed.skills || [],
      documents: parsed.documents || [],

      documentProtection: {
        ...emptyPortfolio.documentProtection,
        ...(parsed.documentProtection || {}),
      },
    };
  } catch {
    return emptyPortfolio;
  }
}

function setByPath(object, path, value) {
  const parts = path.split(".");
  const next = structuredClone(object);

  let cursor = next;

  parts.slice(0, -1).forEach((part) => {
    cursor = cursor[part];
  });

  cursor[parts.at(-1)] = value;

  return next;
}

function isNonEmpty(value) {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return Boolean(value);
}

function sectionComplete(data, id) {
  switch (id) {
    case "profile":
      return (
        isNonEmpty(data.profile.name) &&
        isNonEmpty(data.profile.title) &&
        isNonEmpty(data.slug)
      );

    case "hero":
      return (
        isNonEmpty(data.hero.headline) &&
        isNonEmpty(data.hero.description)
      );

    case "about":
      return isNonEmpty(data.about.description);

    case "experience":
      return (
        data.experience.length > 0 &&
        data.experience.every(
          (item) =>
            isNonEmpty(item.company) &&
            isNonEmpty(item.position)
        )
      );

    case "education":
  return (
    data.education.length > 0 &&
    data.education.every(
      (item) =>
        isNonEmpty(item.institution) &&
        isNonEmpty(item.degree)
    )
  );

    case "skills":
  return (
    data.skills.length > 0 &&
    data.skills.every((item) => {
      const level = Number(item.level);

      return (
        isNonEmpty(item.name) &&
        Number.isFinite(level) &&
        level >= 1 &&
        level <= 100
      );
    })
  );

    case "documents":
      return (
        data.documents.length > 0 &&
        data.documents.every(
          (item) =>
            isNonEmpty(item.name) &&
            ["certificate", "award", "license", "other"].includes(
              item.type
            ) &&
            Boolean(item.publicId || item.fileUrl)
        ) &&
        (!data.documentProtection?.enabled ||
          /^\d{6}$/.test(
            String(data.documentProtection?.pin || "")
          ))
      );

    case "resume":
      return (
        isNonEmpty(data.resume.name) &&
        isNonEmpty(data.resume.fileUrl)
      );

    case "social":
  return Object.values(data.socialLinks).some(isNonEmpty);

    default:
      return false;
  }
}

export default function CreatePortfolio() {
  const navigate = useNavigate();

  const [data, setData] = useState(readDraft);

  const [currentStep, setCurrentStep] = useState(() => {
    const stored = Number(
      sessionStorage.getItem(STEP_STORAGE_KEY)
    );

    return Number.isInteger(stored) &&
      stored >= 0 &&
      stored < steps.length
      ? stored
      : 0;
  });

  const [error, setError] = useState("");
const [savedAt, setSavedAt] = useState(null);

const [portfolioExists, setPortfolioExists] = useState(false);
const [loadingPortfolio, setLoadingPortfolio] = useState(true);
// Saving is blocked when the saved portfolio could not be loaded,
// so an empty form never overwrites real data
const [loadFailed, setLoadFailed] = useState(false);
const [savingPortfolio, setSavingPortfolio] = useState(false);

  // Firebase file upload state
  const [uploadingFile, setUploadingFile] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const step = steps[currentStep];

  const isReview = step.id === "review";

  // Move focus and scroll to the new step heading so keyboard and
  // screen reader users land on the step they just opened.
  const headingRef = useRef(null);
  const firstStepRender = useRef(true);

  useEffect(() => {
    if (firstStepRender.current) {
      firstStepRender.current = false;
      return;
    }

    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });

    headingRef.current?.focus({ preventScroll: true });
  }, [currentStep]);

  const completedSections = useMemo(
    () =>
      steps
        .slice(0, -1)
        .filter((item) =>
          sectionComplete(data, item.id)
        ).length,
    [data]
  );

  const progress = Math.round(
    (completedSections / (steps.length - 1)) * 100
  );

  useEffect(() => {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );

    sessionStorage.setItem(
      STEP_STORAGE_KEY,
      String(currentStep)
    );

    setSavedAt(new Date());
  }, [data, currentStep]);

  useEffect(() => {
  async function loadPortfolio() {
    try {
      const result = await apiRequest(
        "/api/portfolios/me"
      );

      if (result.portfolio) {
        setData((current) => ({
          ...current,
          ...result.portfolio,
          profile: {
            ...current.profile,
            ...(result.portfolio.profile || {}),
            imageUrl: result.portfolio.profile?.imageUrl?.startsWith("blob:")
              ? ""
              : result.portfolio.profile?.imageUrl ||
                current.profile.imageUrl,
          },
          hero: {
            ...current.hero,
            ...(result.portfolio.hero || {}),
          },
          about: {
            ...current.about,
            ...(result.portfolio.about || {}),
          },
          resume: {
            ...current.resume,
            ...(result.portfolio.resume || {}),
          },
          socialLinks: {
            ...current.socialLinks,
            ...(result.portfolio.socialLinks || {}),
          },
          experience:
            result.portfolio.experience || [],
          education:
            result.portfolio.education || [],
          skills:
            result.portfolio.skills || [],
          documents:
            result.portfolio.documents || [],
          documentProtection: {
            ...current.documentProtection,
            ...(result.portfolio.documentProtection || {}),
            pin: "",
          },
        }));

        setPortfolioExists(true);
      }
    } catch (error) {
      // 404 simply means the user has not created
      // a portfolio yet.
      if (
        !error.message
          .toLowerCase()
          .includes("not found")
      ) {
        console.error(
          "Failed to load portfolio:",
          error
        );
        setLoadFailed(true);
      }
    } finally {
      setLoadingPortfolio(false);
    }
  }

  loadPortfolio();
}, []);

  function update(path, value) {
    setError("");

    setData((current) =>
      setByPath(current, path, value)
    );
  }

  function addItem(type) {
    const templates = {
      experience: {
        company: "",
        position: "",
        location: "",
        startDate: "",
        endDate: "",
        isCurrent: false,
        description: "",
        order: data.experience.length,
      },

      education: {
        institution: "",
        degree: "",
        fieldOfStudy: "",
        startYear: "",
        endYear: "",
        description: "",
        order: data.education.length,
      },

      skills: {
        name: "",
        level: 75,
        order: data.skills.length,
      },

      documents: {
        name: "",
        type: "other",
        fileUrl: "",
        order: data.documents.length,
      },
    };

    setData((current) => ({
      ...current,
      [type]: [
        ...current[type],
        templates[type],
      ],
    }));

    setError("");
  }

  function updateItem(type, index, field, value) {
  setData((current) => ({
    ...current,
    [type]: current[type].map(
      (item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
    ),
  }));

  setError("");
}

  function removeItem(type, index) {
  setData((current) => ({
    ...current,

    [type]: current[type]
      .filter(
        (_, itemIndex) =>
          itemIndex !== index
      )
      .map((item, itemIndex) => ({
        ...item,
        order: itemIndex,
      })),
  }));

  setError("");
}

  async function handleFile(type, index, event) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  const maxSize =
    type === "profile"
      ? 5 * 1024 * 1024
      : 10 * 1024 * 1024;

  if (file.size > maxSize) {
    setError(
      type === "profile"
        ? "Profile photo must be smaller than 5 MB."
        : "Files must be smaller than 10 MB."
    );
    event.target.value = "";
    return;
  }

  const user = currentUser();

  if (!user) {
    setError("You must be signed in before uploading a file.");
    event.target.value = "";
    return;
  }

  const allowedDocumentTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
  ];
  const allowedProfilePhotoTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  const allowedResumeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (
    type === "resume" &&
    !allowedResumeTypes.includes(file.type)
  ) {
    setError("Resume must be a PDF, DOC, or DOCX file.");
    event.target.value = "";
    return;
  }

  if (
    type === "documents" &&
    !allowedDocumentTypes.includes(file.type)
  ) {
    setError(
      "Document must be a PDF, DOC, DOCX, JPG, or PNG file."
    );
    event.target.value = "";
    return;
  }

  if (
    type === "profile" &&
    !allowedProfilePhotoTypes.includes(file.type)
  ) {
    setError("Please upload a JPG, PNG, or WebP image.");
    event.target.value = "";
    return;
  }

  try {
    setError("");

    const uploadKey =
      type === "resume"
        ? "resume"
        : type === "profile"
          ? "profile-photo"
          : `document-${index}`;

    setUploadingFile(uploadKey);
    setUploadProgress(0);

    const token = await user.getIdToken();

    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "protected",
      type === "documents" ? "true" : "false"
    );

    const response = await fetch("/api/uploads", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error(
        "The upload server returned an invalid response."
      );
    }

    if (!response.ok) {
      throw new Error(
        result.message || "File upload failed."
      );
    }

    const uploadedFile = result.file;

    if (!uploadedFile?.publicId) {
      throw new Error(
        "Upload succeeded, but no file identifier was returned."
      );
    }

    if (
      type !== "documents" &&
      !uploadedFile?.url
    ) {
      throw new Error(
        "Upload succeeded, but no file URL was returned."
      );
    }

    if (type === "resume") {
      setData((current) => ({
        ...current,
        resume: {
          ...current.resume,
          name: file.name,
          fileUrl: uploadedFile.url,
          publicId: uploadedFile.publicId,
          resourceType: uploadedFile.resourceType,
          format: uploadedFile.format,
          mimeType: uploadedFile.mimeType,
        },
      }));
    } else if (type === "profile") {
      setData((current) => ({
        ...current,
        profile: {
          ...current.profile,
          imageUrl: uploadedFile.url,
        },
      }));
    } else {
      setData((current) => ({
        ...current,
        documents: current.documents.map(
          (item, itemIndex) =>
            itemIndex === index
              ? {
                  ...item,
                  name: file.name,
                  fileUrl: "",
                  publicId: uploadedFile.publicId,
                  resourceType: uploadedFile.resourceType,
                  format: uploadedFile.format,
                  mimeType: uploadedFile.mimeType,
                  size: uploadedFile.size,
                  protected: true,
                }
              : item
        ),
      }));
    }

    setUploadProgress(100);
  } catch (error) {
    console.error(
      "Cloudinary upload error:",
      error
    );

    setError(
      error.message ||
        "Unable to upload file."
    );

    event.target.value = "";
  } finally {
    setUploadingFile("");
    setUploadProgress(0);
  }
}

  async function handleVideoFile(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const maxSize = 100 * 1024 * 1024;
    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-m4v",
      "video/3gpp",
      "video/3gpp2",
      "video/x-msvideo",
      "application/octet-stream",
    ];
    const fileExtension = file.name
      ?.split(".")
      .pop()
      ?.toLowerCase();
    const isAllowedVideoExtension = [
      "mp4",
      "mov",
      "m4v",
      "m4",
      "webm",
      "avi",
    ].includes(fileExtension);

    if (file.size <= 0) {
      setError("The selected video file is empty.");
      event.target.value = "";
      return;
    }

    if (file.size > maxSize) {
      setError(
        `Video must be smaller than ${maxSize / (1024 * 1024)} MB.`
      );
      event.target.value = "";
      return;
    }

    if (
      !allowedTypes.includes(file.type) &&
      !isAllowedVideoExtension
    ) {
      setError(
        "Please upload an MP4, MOV, M4, M4V, WebM, or AVI video."
      );
      event.target.value = "";
      return;
    }

    const user = currentUser();

    if (!user) {
      setError(
        "You must be signed in before uploading a video."
      );
      event.target.value = "";
      return;
    }

    let uploadSucceeded = false;

    try {
      setError("");
      setUploadingFile("video-uploading");
      setUploadProgress(0);

      const token = await user.getIdToken();

      const signatureResponse = await fetch(
        "/api/uploads/video-signature",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            size: file.size,
          }),
        }
      );

      let signatureData;

      try {
        signatureData = await signatureResponse.json();
      } catch {
        throw new Error(
          "Upload failed. The server sent an unexpected reply. Try again in a moment."
        );
      }

      if (!signatureResponse.ok) {
        throw new Error(
          signatureData.message || "Could not prepare the video upload."
        );
      }

      if (!signatureData?.uploadUrl || !signatureData?.signature || !signatureData?.apiKey) {
        throw new Error(
          "Upload failed. The server could not start the upload. Try again in a moment."
        );
      }

      const chunkSize = 5 * 1024 * 1024;
      const uploadId = `westforce-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const totalChunks = Math.ceil(file.size / chunkSize);

      let uploadedFile = null;
      let start = 0;

      for (let index = 0; index < totalChunks; index += 1) {
        const end = Math.min(start + chunkSize - 1, file.size - 1);
        const chunk = file.slice(start, end + 1);
        const contentRange = `bytes ${start}-${end}/${file.size}`;

        const formData = new FormData();

        Object.entries(signatureData.params || {}).forEach(
          ([key, value]) => {
            formData.append(key, String(value));
          }
        );

        formData.append("file", chunk, file.name);
        formData.append("api_key", String(signatureData.apiKey));
        formData.append("signature", String(signatureData.signature));

        uploadedFile = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.open("POST", signatureData.uploadUrl, true);
          xhr.timeout = 300000;
          xhr.withCredentials = false;
          xhr.setRequestHeader("X-Unique-Upload-Id", uploadId);
          xhr.setRequestHeader("Content-Range", contentRange);

          xhr.upload.onprogress = (progressEvent) => {
            if (!progressEvent.lengthComputable) {
              return;
            }

            const requestProgress = progressEvent.loaded / progressEvent.total;
            const fileBytesLoaded = Math.min(
              file.size,
              start + requestProgress * chunk.size
            );
            const totalProgress = Math.min(
              95,
              Math.round((fileBytesLoaded / file.size) * 100)
            );

            setUploadProgress(totalProgress);
          };

          xhr.onload = () => {
            if (xhr.status < 200 || xhr.status >= 300) {
              console.error("[cloudinary] upload failed", {
                status: xhr.status,
              });
              let message = "Video upload failed. Check your connection and try again.";

              try {
                const payload = JSON.parse(xhr.responseText);
                message = payload?.error?.message || payload?.message || message;
              } catch {
                message = (xhr.responseText || "").slice(0, 500) || message;
              }

              reject(new Error(`${message} (HTTP ${xhr.status})`));
              return;
            }

            try {
              const payload = JSON.parse(xhr.responseText);

              if (payload?.error) {
                throw new Error(payload.error.message || "Video upload failed. Check your connection and try again.");
              }

              if (payload?.done === false) {
                resolve(payload);
                return;
              }

              if (!payload?.secure_url && !payload?.public_id && !payload?.done) {
                throw new Error("Video upload did not finish. Try again.");
              }

              resolve(payload);
            } catch (error) {
              reject(
                new Error(
                  error.message ||
                    "Video upload failed. The server sent an unexpected reply. Try again."
                )
              );
            }
          };

          xhr.onerror = () => {
            console.error("[cloudinary] upload network error", {
              status: xhr.status,
              online: navigator.onLine,
            });
            reject(new Error("Network error while uploading the video."));
          };

          xhr.ontimeout = () => {
            console.error("[cloudinary] upload timeout", {
              timeout: xhr.timeout,
              online: navigator.onLine,
            });
            reject(new Error("Video upload timed out. Please try again."));
          };

          xhr.onabort = () => {
            console.warn("[cloudinary] upload aborted");
            reject(new Error("Video upload was cancelled."));
          };

          xhr.send(formData);
        });

        if (uploadedFile?.done === true || uploadedFile?.secure_url) {
          break;
        }

        start = end + 1;
      }

      if (!uploadedFile || (!uploadedFile.secure_url && uploadedFile.done !== true)) {
        throw new Error("Video upload did not finish. Check your connection and try again.");
      }

      const secureUrl = uploadedFile.secure_url || uploadedFile.url;
      const publicId = uploadedFile.public_id || "";

      if (!secureUrl) {
        throw new Error(
          "Upload succeeded, but no video URL was returned."
        );
      }

      setData((current) => ({
        ...current,
        about: {
          ...current.about,
          videoUrl: secureUrl,
          videoPublicId: publicId,
          videoStatus: "uploaded",
        },
      }));

      setUploadProgress(100);
      uploadSucceeded = true;

      const persistedUpload = {
        ...data,
        about: {
          ...(data.about || {}),
          videoUrl: secureUrl,
          videoPublicId: publicId,
          videoStatus: "uploaded",
        },
      };

      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(persistedUpload)
      );
    } catch (error) {
      console.error("Video upload error:", error);
      setError(error.message || "Unable to upload your video.");
    } finally {
      setUploadingFile("");
      if (!uploadSucceeded) {
        setUploadProgress(0);
      }
      event.target.value = "";
    }
  }

  function validateStep() {
  if (
    step.id === "profile" &&
    (
      !isNonEmpty(data.profile.name) ||
      !isNonEmpty(data.profile.title) ||
      !isNonEmpty(data.slug)
    )
  ) {
    return "Please enter your name, professional title and public URL slug.";
  }

  if (
    step.id === "hero" &&
    (
      !isNonEmpty(data.hero.headline) ||
      !isNonEmpty(data.hero.description)
    )
  ) {
    return "Please add a hero headline and description.";
  }

  if (
    step.id === "about" &&
    !isNonEmpty(data.about.description)
  ) {
    return "Please add your professional story before continuing.";
  }

  if (step.id === "experience") {
    for (const item of data.experience) {
      if (
        !isNonEmpty(item.company) ||
        !isNonEmpty(item.position)
      ) {
        return "Complete the company and position for each experience entry.";
      }

      if (
        item.startDate &&
        item.endDate &&
        !item.isCurrent &&
        item.endDate < item.startDate
      ) {
        return "An experience end date cannot be earlier than its start date.";
      }

      if (
        item.isCurrent &&
        item.endDate
      ) {
        return "Current positions should not have an end date.";
      }
    }
  }

  if (step.id === "education") {
    for (const item of data.education) {
      if (
        !isNonEmpty(item.institution) ||
        !isNonEmpty(item.degree)
      ) {
        return "Complete the institution and degree for each education entry.";
      }

      if (
        item.startYear &&
        !/^\d{4}$/.test(String(item.startYear))
      ) {
        return "Enter the start year as a full year, like 2020.";
      }

      if (
        item.endYear &&
        !/^\d{4}$/.test(String(item.endYear))
      ) {
        return "Enter the end year as a full year, like 2024.";
      }

      if (
        item.startYear &&
        item.endYear &&
        Number(item.endYear) < Number(item.startYear)
      ) {
        return "An education end year cannot be earlier than the start year.";
      }
    }
  }

  if (step.id === "skills") {
  for (const item of data.skills) {
    if (!isNonEmpty(item.name)) {
      return "Complete each skill name or remove the empty skill.";
    }

    const level = Number(item.level);

    if (
      !Number.isFinite(level) ||
      level < 1 ||
      level > 100
    ) {
      return "Skill proficiency must be between 1 and 100.";
    }
  }
}

  if (step.id === "documents") {
    for (const item of data.documents) {
      if (!isNonEmpty(item.name)) {
        return "Complete each document name or remove the empty document.";
      }

      if (
        !["certificate", "award", "license", "other"].includes(
          item.type
        )
      ) {
        return "Choose a valid document type.";
      }

      if (!item.publicId && !item.fileUrl) {
        return "Upload a file for each document or remove the empty document.";
      }
    }

    if (data.documentProtection?.enabled) {
      if (!/^\d{6}$/.test(String(data.documentProtection.pin || ""))) {
        return "Enter a 6-digit PIN to protect your documents.";
      }
    }
  }

  return null;
}

  function next() {
    const validation = validateStep();

    if (validation) {
      setError(validation);
      return;
    }

    setError("");

    setCurrentStep((value) =>
      Math.min(
        value + 1,
        steps.length - 1
      )
    );
  }

  function back() {
    setError("");

    setCurrentStep((value) =>
      Math.max(value - 1, 0)
    );
  }

  function handleStepClick(index) {
    if (index === steps.length - 1) {
      return;
    }

    setError("");
    setCurrentStep(index);
  }

  async function finish() {
    if (loadingPortfolio || loadFailed) return;

    const incompleteSections = steps
      .slice(0, -1)
      .filter(
        (item) =>
          !sectionComplete(data, item.id)
      );

    if (incompleteSections.length > 0) {
      const firstIncomplete =
        incompleteSections[0];

      const firstIncompleteIndex =
        steps.findIndex(
          (item) =>
            item.id === firstIncomplete.id
        );

      setError(
        `Please complete: ${incompleteSections
          .map((item) => item.label)
          .join(", ")}.`
      );

      if (firstIncompleteIndex !== -1) {
        setCurrentStep(firstIncompleteIndex);
      }

      return;
    }

    try {
      setError("");
      setSavingPortfolio(true);

      const finalData = {
        ...data,
        status: portfolioExists
          ? data.status
          : "draft",
        documentProtection: data.documentProtection?.enabled
          ? {
              enabled: true,
              pin: data.documentProtection.pin,
            }
          : {
              enabled: false,
            },
      };

      const result = portfolioExists
        ? await apiRequest("/api/portfolios/me", {
            method: "PUT",
            body: JSON.stringify(finalData),
          })
        : await apiRequest("/api/portfolios", {
            method: "POST",
            body: JSON.stringify(finalData),
          });

      const savedPortfolio = result.portfolio || finalData;

      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(savedPortfolio)
      );

      sessionStorage.setItem(
        STEP_STORAGE_KEY,
        String(currentStep)
      );

      setData((current) => ({
        ...current,
        ...savedPortfolio,
      }));

      setPortfolioExists(true);

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Failed to save portfolio:",
        error
      );

      const hasCloudinaryVideoUpload = Boolean(
        data.about?.videoUrl &&
          data.about.videoUrl.includes("res.cloudinary.com")
      );

      setError(
        hasCloudinaryVideoUpload
          ? "Your video uploaded successfully, but the portfolio draft could not be saved. Please try again."
          : error.message ||
              "Unable to save your portfolio. Please try again."
      );
    } finally {
      setSavingPortfolio(false);
    }
  }
  return (
    <main className="portfolio-builder-page">
      <div className="portfolio-builder-shell">

        {/* TOP BAR */}

        <header className="portfolio-builder-topbar">
          <Link
            to="/"
            className="portfolio-builder-brand"
          >
            <img src="/favicon.png" alt="" className="onboarding-leaf" width="30" height="30" />

            <span>WestForce</span>
          </Link>

          <div className="builder-topbar-end">
            <div className="portfolio-builder-save" role="status">
              {savedAt && (
                <Check size={14} aria-hidden="true" />
              )}

              <span>
                {savedAt
                  ? "Draft saved on this device"
                  : "Saving draft…"}
              </span>
            </div>

            <Link to="/dashboard" className="ob-exit">
              Exit setup
            </Link>
          </div>
        </header>

        {/* MAIN */}

        <div className="portfolio-builder-layout">

          {/* SIDEBAR */}

          <aside className="portfolio-builder-sidebar">

            <div className="builder-progress-card">
              <div className="builder-progress-heading">
                <span>
                  Portfolio progress
                </span>

                <strong>
                  {progress}%
                </strong>
              </div>

              <div className="builder-progress-track">
                <div
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <p>
                {completedSections} of{" "}
                {steps.length - 1} sections complete
              </p>
            </div>

            <nav
              className="builder-stepper"
              aria-label="Portfolio sections"
            >
              {steps.map((item, index) => {
                const Icon = item.icon;

                const complete =
                  sectionComplete(
                    data,
                    item.id
                  );

                const active =
                  index === currentStep;

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`builder-step ${
                      active ? "active" : ""
                    } ${
                      complete ? "complete" : ""
                    }`}
                    onClick={() =>
                      handleStepClick(index)
                    }
                    aria-current={
                      active ? "step" : undefined
                    }
                    disabled={
                      index ===
                      steps.length - 1
                    }
                  >
                    <span className="builder-step-icon">
                      {complete ? (
                        <Check size={15} />
                      ) : (
                        <Icon size={15} />
                      )}
                    </span>

                    <span>
                      {item.label}
                    </span>

                    {complete && (
                      <small>
                        Done
                      </small>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* CONTENT */}

          <section className="portfolio-builder-content">

            <div className="builder-content-header">
              <p className="builder-step-count">
                Step {currentStep + 1} of {steps.length}
              </p>

              <div className="builder-step-bar" aria-hidden="true">
                <span
                  style={{
                    width: `${((currentStep + 1) / steps.length) * 100}%`,
                  }}
                />
              </div>

              <h1 ref={headingRef} tabIndex={-1}>
                {sectionCopy[step.id].title}
              </h1>

              <p>
                {sectionCopy[step.id].description}
              </p>
            </div>

            {error && (
              <div
                className="builder-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {loadFailed && (
              <div className="builder-error" role="alert">
                We couldn't load your saved portfolio, so saving is off to
                protect it. Check your connection and reload the page.
              </div>
            )}

            <div className="builder-form-card" key={step.id}>

              {loadingPortfolio && (
                <div
                  className="onboarding-skeleton"
                  role="status"
                  aria-label="Loading your saved portfolio"
                >
                  <span className="ob-skeleton-line wide" />
                  <span className="ob-skeleton-line" />
                  <span className="ob-skeleton-block" />
                </div>
              )}

              {!loadingPortfolio && (
              <>
              {step.id === "profile" && (
                <ProfileSection
                  data={data}
                  update={update}
                  handleFile={handleFile}
                  uploadingFile={uploadingFile}
                />
              )}

              {step.id === "hero" && (
                <HeroSection
                  data={data}
                  update={update}
                />
              )}

              {step.id === "about" && (
                <AboutSection
                  data={data}
                  update={update}
                  handleVideoFile={
                    handleVideoFile
                  }
                  uploadingFile={uploadingFile}
                  uploadProgress={uploadProgress}
                />
              )}

              {step.id === "experience" && (
                <ExperienceSection
                  data={data}
                  addItem={addItem}
                  updateItem={updateItem}
                  removeItem={removeItem}
                />
              )}

              {step.id === "education" && (
                <EducationSection
                  data={data}
                  addItem={addItem}
                  updateItem={updateItem}
                  removeItem={removeItem}
                />
              )}

              {step.id === "skills" && (
                <SkillsSection
                  data={data}
                  addItem={addItem}
                  updateItem={updateItem}
                  removeItem={removeItem}
                />
              )}

              {step.id === "documents" && (
  <DocumentsSection
    data={data}
    update={update}
    addItem={addItem}
    updateItem={updateItem}
    removeItem={removeItem}
    handleFile={handleFile}
  />
)}

              {step.id === "resume" && (
  <ResumeSection
    data={data}
    update={update}
    handleFile={handleFile}
  />
)}

              {step.id === "social" && (
  <SocialLinksSection
    data={data}
    update={update}
  />
)}

              {step.id === "review" && (
  <ReviewSection
    data={data}
    progress={progress}
    onEdit={(sectionId) => {
      const index = steps.findIndex(
        (item) => item.id === sectionId
      );

      if (index !== -1) {
        handleStepClick(index);
      }
    }}
  />
)}
              </>
              )}

            </div>

            {/* ACTIONS */}

            <div className="builder-actions">

              <button
                type="button"
                className="btn btn-secondary builder-back"
                onClick={back}
                disabled={currentStep === 0}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                Back
              </button>

              <div className="builder-actions-right">

                {!isReview && (
                  <span className="builder-session-note">
                    Your changes save as you go.
                  </span>
                )}

                {isReview ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={finish}
                    disabled={
                      savingPortfolio || loadingPortfolio || loadFailed
                    }
                    aria-busy={savingPortfolio || undefined}
                  >
                    {savingPortfolio
                      ? "Saving portfolio…"
                      : "Finish and open dashboard"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={next}
                  >
                    Continue
                  </button>
                )}

              </div>
            </div>

          </section>
        </div>
      </div>
    </main>
  );
}

/* =========================================================
   FIELD
   ========================================================= */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  help,
  maxLength,
  disabled = false,
  inputMode,
  min,
  max,
}) {
  return (
    <label className="builder-field">
      <span>
        {label}
        {required && <b>*</b>}
      </span>

      <input
        type={type}
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        disabled={disabled}
        inputMode={inputMode}
        min={min}
        max={max}
      />

      {help && <small>{help}</small>}
    </label>
  );
}

/* =========================================================
   TEXT AREA
   ========================================================= */

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  rows = 6,
  help,
  maxLength,
}) {
  return (
    <label className="builder-field">
      <span>
        {label}
        {required && <b>*</b>}
      </span>

      <textarea
        value={value ?? ""}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        rows={rows}
        required={required}
        maxLength={maxLength}
      />

      {help && <small>{help}</small>}
    </label>
  );
}

/* =========================================================
   PROFILE
   ========================================================= */

function ProfileSection({
  data,
  update,
  handleFile,
  uploadingFile,
}) {
  const profile = data.profile;

  function handleSlugChange(value) {
    const slug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 100);

    update("slug", slug);
  }

  function handleProfilePhoto(event) {
    handleFile("profile", 0, event);
  }

  return (
    <div className="builder-section-stack">
      <div className="builder-fields-grid">
        <div className="builder-field-full builder-photo-row">
          <div className="builder-photo-placeholder">
            {profile.imageUrl ? (
              <img
                src={profile.imageUrl}
                width="80"
                height="80"
                alt={profile.name || "Profile"}
              />
            ) : (
              <UserRound size={25} />
            )}
          </div>

          <div className="builder-photo-copy">
            <strong>Profile photo</strong>
            <p>
              Optional. Add a professional photo that will appear on your
              portfolio.
            </p>
          </div>

          <input
            id="profile-photo-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleProfilePhoto}
            style={{ display: "none" }}
          />

          <button
            type="button"
            className="builder-outline"
            disabled={uploadingFile === "profile-photo"}
            onClick={() =>
              document.getElementById("profile-photo-input")?.click()
            }
          >
            <ImagePlus size={16} />
            {uploadingFile === "profile-photo"
              ? "Uploading photo..."
              : profile.imageUrl
                ? "Change photo"
                : "Add photo"}
          </button>
        </div>

        <Field
          label="Full public name"
          value={profile.name}
          onChange={(value) => update("profile.name", value)}
          placeholder="e.g. Mayank Rawat"
          required
          help="This is the name employers will see on your portfolio."
        />

        <Field
          label="Professional title"
          value={profile.title}
          onChange={(value) => update("profile.title", value)}
          placeholder="e.g. Full Stack Developer"
          required
          help="Keep this clear and specific."
        />

        <Field
          label="Location"
          value={profile.location}
          onChange={(value) => update("profile.location", value)}
          placeholder="e.g. Calgary, AB"
          help="Optional."
        />

        <Field
          label="Email"
          value={profile.email}
          onChange={(value) => update("profile.email", value)}
          placeholder="e.g. you@example.com"
          type="email"
          help="Optional."
        />

        <Field
          label="Phone"
          value={profile.phone}
          onChange={(value) => update("profile.phone", value)}
          placeholder="e.g. +1 416 555 0134"
          type="tel"
          help="Optional."
        />

        <div className="builder-field-full">
          <label className="builder-field">
            <span>
              Public portfolio URL<b>*</b>
            </span>

            <div className="builder-slug-input">
              <span>westforce.com/portfolio/</span>

              <input
                type="text"
                value={data.slug}
                onChange={(event) =>
                  handleSlugChange(event.target.value)
                }
                placeholder="mayank-rawat"
                maxLength={100}
                required
              />
            </div>

            <small>
              Use lowercase letters, numbers and hyphens only.
            </small>
          </label>
        </div>

        <div className="builder-field-full">
          <div className="builder-availability-card">
            <div>
              <strong>Available for work</strong>
              <p>
                Let employers know whether you're currently open to
                opportunities.
              </p>
            </div>

            <label className="builder-toggle">
              <input
                type="checkbox"
                checked={Boolean(profile.availableForWork)}
                onChange={(event) =>
                  update(
                    "profile.availableForWork",
                    event.target.checked
                  )
                }
              />

              <span className="builder-toggle-track">
                <span className="builder-toggle-thumb" />
              </span>

              <strong>
                {profile.availableForWork ? "Yes" : "No"}
              </strong>
            </label>
          </div>
        </div>

        <div className="builder-field-full">
          <WorkDetails profile={profile} update={update} />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   WORK DETAILS (hire facts, all optional)
   ========================================================= */

const JOB_TYPE_CHOICES = [
  { value: "full_time", label: "Full time" },
  { value: "part_time", label: "Part time" },
  { value: "casual", label: "Casual" },
];

const SHIFT_CHOICES = [
  { value: "days", label: "Days" },
  { value: "evenings", label: "Evenings" },
  { value: "nights", label: "Nights" },
  { value: "weekends", label: "Weekends" },
];

const LANGUAGE_CHOICES = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
];

function toggleValue(list, value) {
  const current = Array.isArray(list) ? list : [];

  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

function ChipGroup({ legend, choices, selected, onToggle }) {
  const picked = Array.isArray(selected) ? selected : [];

  return (
    <fieldset className="builder-chip-group">
      <legend>{legend}</legend>

      <div className="builder-chips">
        {choices.map((choice) => {
          const isOn = picked.includes(choice.value);

          return (
            <button
              key={choice.value}
              type="button"
              className="builder-chip"
              aria-pressed={isOn}
              onClick={() => onToggle(choice.value)}
            >
              {isOn && <Check size={14} aria-hidden="true" />}
              {choice.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function WorkDetails({ profile, update }) {
  const availability = profile.availability || {};
  const travel = profile.travel || {};
  const startDate = availability.startDate || "";
  const startsNow = startDate === "now";

  function setAvailability(field, value) {
    update("profile.availability", { ...availability, [field]: value });
  }

  function setTravel(field) {
    update("profile.travel", { ...travel, [field]: !travel[field] });
  }

  return (
    <section className="builder-work-details" aria-labelledby="work-details-title">
      <div className="builder-work-details-head">
        <strong id="work-details-title">Work details</strong>
        <p>
          Optional. These show at the top of your portfolio so an employer
          can see at a glance if you fit the job.
        </p>
      </div>

      <div className="builder-work-details-grid">
        <ChipGroup
          legend="Job type"
          choices={JOB_TYPE_CHOICES}
          selected={availability.jobTypes}
          onToggle={(value) =>
            setAvailability("jobTypes", toggleValue(availability.jobTypes, value))
          }
        />

        <ChipGroup
          legend="Shifts"
          choices={SHIFT_CHOICES}
          selected={availability.shifts}
          onToggle={(value) =>
            setAvailability("shifts", toggleValue(availability.shifts, value))
          }
        />

        <fieldset className="builder-chip-group">
          <legend>When you can start</legend>

          <div className="builder-chips">
            <button
              type="button"
              className="builder-chip"
              aria-pressed={startsNow}
              onClick={() => setAvailability("startDate", startsNow ? "" : "now")}
            >
              {startsNow && <Check size={14} aria-hidden="true" />}
              Now
            </button>

            <input
              type="date"
              className="builder-chip-date"
              aria-label="Or pick a start date"
              value={startsNow ? "" : startDate}
              onChange={(event) =>
                setAvailability("startDate", event.target.value)
              }
            />
          </div>
        </fieldset>

        <ChipGroup
          legend="Languages for work"
          choices={LANGUAGE_CHOICES}
          selected={profile.languages}
          onToggle={(value) =>
            update("profile.languages", toggleValue(profile.languages, value))
          }
        />

        <Field
          label="Where you can work"
          value={profile.workArea}
          onChange={(value) => update("profile.workArea", value)}
          placeholder="e.g. Peel and Toronto"
          maxLength={120}
        />

        <ChipGroup
          legend="Getting there"
          choices={[
            { value: "willing", label: "Willing to travel" },
            { value: "ownCar", label: "Have my own car" },
          ]}
          selected={["willing", "ownCar"].filter((key) => travel[key])}
          onToggle={setTravel}
        />

        <Field
          label="Driver's licence"
          value={profile.driversLicence}
          onChange={(value) => update("profile.driversLicence", value)}
          placeholder="e.g. G"
          maxLength={40}
        />
      </div>
    </section>
  );
}

/* =========================================================
   HERO
   ========================================================= */

function HeroSection({ data, update }) {
  return (
    <div className="builder-section-stack">
      <div className="builder-fields-grid">
        <Field
  label="Greeting"
  value={data.hero.greeting}
  onChange={(value) => update("hero.greeting", value)}
  placeholder="Hello, I'm"
  maxLength={80}
  help="A short introduction above your main headline."
/>

        <Field
  label="Hero headline"
  value={data.hero.headline}
  onChange={(value) => update("hero.headline", value)}
  placeholder="Full Stack Developer building useful digital experiences"
  required
  maxLength={200}
  help={`${data.hero.headline?.length || 0}/200 characters`}
/>

        <div className="builder-field-full">
          <TextArea
  label="Hero description"
  value={data.hero.description}
  onChange={(value) => update("hero.description", value)}
  placeholder="Tell visitors what you do, what you specialize in, and the kind of work you enjoy."
  required
  rows={7}
  maxLength={1000}
  help={`${data.hero.description?.length || 0}/1000 characters`}
/>
        </div>
      </div>

      <div className="builder-info-card">
        <div>
          <strong>Think of this as your first impression.</strong>
          <p>
            Keep the headline specific and use the description to briefly
            explain your strengths, experience, and professional focus.
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ABOUT
   ========================================================= */

function AboutSection({
  data,
  update,
  handleVideoFile,
  uploadingFile,
  uploadProgress,
}) {
  const selectedVideo =
    data.about.videoUrl
      ? (() => {
          const value = data.about.videoUrl.trim();

          if (value.startsWith("pending:")) {
            return value.replace("pending:", "");
          }

          try {
            return decodeURIComponent(
              new URL(value).pathname
                .split("/")
                .pop() || "Uploaded video"
            );
          } catch {
            return value
              .split("/")
              .pop() || "Uploaded video";
          }
        })()
      : "";

  return (
    <div className="builder-fields-grid">

      <Field
        label="Section title"
        value={data.about.title}
        onChange={(v) =>
          update(
            "about.title",
            v
          )
        }
        placeholder="About me"
      />

      <div className="builder-field">
        <span>
          Introduction video
        </span>

        <div className="video-upload-box">

          <div className="video-upload-icon">
            <PlayCircle size={24} />
          </div>

          <div className="video-upload-content">

            <strong>
              {uploadingFile === "video-uploading"
                ? "Uploading video..."
                : selectedVideo || "Upload your introduction video"}
            </strong>

            <p>
              Add a short video introducing
              yourself, your experience,
              or your professional goals.
            </p>

            {uploadingFile === "video-uploading" && (
              <div className="builder-progress-card builder-upload-progress" role="status">
                <div className="builder-progress-heading">
                  <span>Uploading</span>
                  <strong>{Math.max(0, Math.min(100, uploadProgress || 0))}%</strong>
                </div>

                <div className="builder-progress-track">
                  <div style={{ width: `${Math.max(0, Math.min(100, uploadProgress || 0))}%` }} />
                </div>
              </div>
            )}

            <small>
              MP4, MOV or WebM, up to 100 MB
            </small>

          </div>

          <label className="builder-outline video-upload-button">

            <Plus size={16} />

            {selectedVideo
              ? "Change video"
              : "Choose video"}

            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.mov,.m4,.m4v,.webm"
              onChange={handleVideoFile}
              disabled={uploadingFile.startsWith("video-")}
            />

          </label>

        </div>
      </div>

      <div className="builder-field-full">

        <TextArea
          label="Biography / professional summary"
          value={data.about.description}
          onChange={(v) =>
            update(
              "about.description",
              v
            )
          }
          placeholder="Tell employers about your background, strengths, interests and the kind of work you do best."
          required
          rows={10}
          help="Up to 5,000 characters."
        />

      </div>

    </div>
  );
}

/* =========================================================
   EXPERIENCE
   ========================================================= */

function ExperienceSection({
  data,
  addItem,
  updateItem,
  removeItem,
}) {
  return (
    <div className="builder-section-stack">

      <div className="builder-section-header">
        <div>
          <h3>Work experience</h3>
          <p>
            Add your professional experience, starting with your most recent role.
          </p>
        </div>

        <button
          type="button"
          className="builder-outline"
          onClick={() => addItem("experience")}
        >
          <Plus size={16} />
          Add experience
        </button>
      </div>

      {data.experience.length === 0 ? (
        <div className="builder-empty-state">
          <BriefcaseBusiness size={28} />

          <div>
            <strong>No experience added yet</strong>
            <p>
              Add your current or previous roles to help employers understand
              your professional background.
            </p>
          </div>

          <button
            type="button"
            className="builder-primary"
            onClick={() => addItem("experience")}
          >
            <Plus size={16} />
            Add your first experience
          </button>
        </div>
      ) : (
        <div className="builder-repeatable-list">

          {data.experience.map((item, index) => (
            <div
              className="builder-repeatable-card"
              key={index}
            >

              <div className="builder-repeatable-card-header">
                <div>
                  <strong>
                    {item.position ||
                      item.company ||
                      `Experience ${index + 1}`}
                  </strong>

                  <span>
                    {item.company || "New experience"}
                  </span>
                </div>

                <button
                  type="button"
                  className="builder-icon-danger"
                  onClick={() =>
                    removeItem("experience", index)
                  }
                  title="Remove experience"
                >
                  <Trash2 size={17} />
                </button>
              </div>

              <div className="builder-fields-grid">

                <Field
                  label="Company"
                  value={item.company}
                  onChange={(value) =>
                    updateItem(
                      "experience",
                      index,
                      "company",
                      value
                    )
                  }
                  placeholder="e.g. Microsoft"
                  required
                  maxLength={160}
                  help={`${item.company?.length || 0}/160`}
                />

                <Field
                  label="Position"
                  value={item.position}
                  onChange={(value) =>
                    updateItem(
                      "experience",
                      index,
                      "position",
                      value
                    )
                  }
                  placeholder="e.g. Full Stack Developer"
                  required
                  maxLength={160}
                  help={`${item.position?.length || 0}/160`}
                />

                <Field
                  label="Location"
                  value={item.location}
                  onChange={(value) =>
                    updateItem(
                      "experience",
                      index,
                      "location",
                      value
                    )
                  }
                  placeholder="e.g. Vancouver, BC"
                  maxLength={160}
                  help="Optional."
                />

                <Field
                  label="Start date"
                  value={item.startDate}
                  onChange={(value) =>
                    updateItem(
                      "experience",
                      index,
                      "startDate",
                      value
                    )
                  }
                  type="date"
                  help="Optional."
                />

                <Field
                  label="End date"
                  value={item.isCurrent ? "" : item.endDate}
                  onChange={(value) =>
                    updateItem(
                      "experience",
                      index,
                      "endDate",
                      value
                    )
                  }
                  type="date"
                  disabled={Boolean(item.isCurrent)}
                  help={
                    item.isCurrent
                      ? "End date is disabled for your current role."
                      : "Optional."
                  }
                />

                <div className="builder-field">
                  <span>Current position</span>

                  <label className="builder-checkbox">
                    <input
                      type="checkbox"
                      checked={Boolean(item.isCurrent)}
                      onChange={(event) => {
                        const checked =
                          event.target.checked;

                        updateItem(
                          "experience",
                          index,
                          "isCurrent",
                          checked
                        );

                        if (checked) {
                          updateItem(
                            "experience",
                            index,
                            "endDate",
                            ""
                          );
                        }
                      }}
                    />

                    <span>
                      I currently work here
                    </span>
                  </label>

                  <small>
                    Select this if this is your current position.
                  </small>
                </div>

                <div className="builder-field-full">

                  <TextArea
                    label="Description"
                    value={item.description}
                    onChange={(value) =>
                      updateItem(
                        "experience",
                        index,
                        "description",
                        value
                      )
                    }
                    placeholder="Describe your responsibilities, achievements, technologies used, and the impact of your work."
                    rows={7}
                    maxLength={5000}
                    help={`${item.description?.length || 0}/5000 characters`}
                  />

                </div>

              </div>

            </div>
          ))}

          <button
            type="button"
            className="builder-add-row"
            onClick={() => addItem("experience")}
          >
            <Plus size={17} />
            Add another experience
          </button>

        </div>
      )}

    </div>
  );
}

/* =========================================================
   EDUCATION
   ========================================================= */

function EducationSection({
  data,
  addItem,
  updateItem,
  removeItem,
}) {
  return (
    <RepeatableSection
      title="Education"
      empty="No education added yet. Add your highest qualification first."
      button="Add education"
      onAdd={() => addItem("education")}
      count={data.education.length}
    >
      {data.education.map((item, index) => (
        <article
          className="builder-repeat-card"
          key={index}
        >
          <div className="repeat-card-heading">
            <div>
              <span>
                Education {index + 1}
              </span>

              <strong>
                {item.degree ||
                  "New qualification"}
              </strong>
            </div>

            <button
              type="button"
              onClick={() =>
                removeItem(
                  "education",
                  index
                )
              }
              aria-label={`Remove education ${
                index + 1
              }`}
            >
              <Trash2 size={17} />
            </button>
          </div>

          <div className="builder-fields-grid">

            <Field
              label="Institution"
              value={item.institution}
              onChange={(value) =>
                updateItem(
                  "education",
                  index,
                  "institution",
                  value
                )
              }
              placeholder="University, college or school"
              required
              maxLength={200}
              help={`${
                item.institution?.length || 0
              }/200 characters`}
            />

            <Field
              label="Degree / qualification"
              value={item.degree}
              onChange={(value) =>
                updateItem(
                  "education",
                  index,
                  "degree",
                  value
                )
              }
              placeholder="Bachelor of Computer Applications"
              required
              maxLength={200}
              help={`${
                item.degree?.length || 0
              }/200 characters`}
            />

            <Field
              label="Field of study"
              value={item.fieldOfStudy}
              onChange={(value) =>
                updateItem(
                  "education",
                  index,
                  "fieldOfStudy",
                  value
                )
              }
              placeholder="Computer Science"
              maxLength={160}
              help={`${
                item.fieldOfStudy?.length || 0
              }/160 characters`}
            />

            <Field
              label="Start year"
              value={item.startYear}
              onChange={(value) =>
                updateItem(
                  "education",
                  index,
                  "startYear",
                  value
                    .replace(/\D/g, "")
                    .slice(0, 4)
                )
              }
              placeholder="2020"
              inputMode="numeric"
              maxLength={4}
              help="A full year, like 2020."
            />

            <Field
              label="End year"
              value={item.endYear}
              onChange={(value) =>
                updateItem(
                  "education",
                  index,
                  "endYear",
                  value
                    .replace(/\D/g, "")
                    .slice(0, 4)
                )
              }
              placeholder="2024"
              inputMode="numeric"
              maxLength={4}
              help="Leave empty if currently studying."
            />

            <div className="builder-field-full">
              <TextArea
                label="Details"
                value={item.description}
                onChange={(value) =>
                  updateItem(
                    "education",
                    index,
                    "description",
                    value
                  )
                }
                placeholder="Relevant coursework, achievements, projects or activities."
                rows={5}
                maxLength={2000}
                help={`${
                  item.description?.length || 0
                }/2000 characters`}
              />
            </div>

          </div>
        </article>
      ))}
    </RepeatableSection>
  );
}

/* =========================================================
   SKILLS
   ========================================================= */

function SkillsSection({
  data,
  addItem,
  updateItem,
  removeItem,
}) {
  return (
    <RepeatableSection
      title="Skills"
      empty="No skills added yet. Add the technical and professional skills you want employers to notice."
      button="Add skill"
      onAdd={() => addItem("skills")}
      count={data.skills.length}
    >
      {data.skills.map((item, index) => (
        <article
          className="builder-repeat-card"
          key={index}
        >
          <div className="repeat-card-heading">
            <div>
              <span>
                Skill {index + 1}
              </span>

              <strong>
                {item.name || "New skill"}
              </strong>
            </div>

            <button
              type="button"
              onClick={() =>
                removeItem("skills", index)
              }
              aria-label={`Remove skill ${index + 1}`}
            >
              <Trash2 size={17} />
            </button>
          </div>

          <div className="builder-fields-grid">

            <Field
              label="Skill name"
              value={item.name}
              onChange={(value) =>
                updateItem(
                  "skills",
                  index,
                  "name",
                  value
                )
              }
              placeholder="e.g. React.js"
              required
              maxLength={100}
              help={`${item.name?.length || 0}/100 characters`}
            />

            <div className="builder-field">
              <span>
                Proficiency level
              </span>

              <div className="skill-level-row">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={Number(item.level) || 1}
                  onChange={(event) =>
                    updateItem(
                      "skills",
                      index,
                      "level",
                      Number(event.target.value)
                    )
                  }
                />

                <strong>
                  {Number(item.level) || 1}%
                </strong>
              </div>

              <small>
                Set how confident you are with this skill.
              </small>
            </div>

          </div>
        </article>
      ))}
    </RepeatableSection>
  );
}

/* =========================================================
   DOCUMENTS
   ========================================================= */

function DocumentsSection({
  data,
  update,
  addItem,
  updateItem,
  removeItem,
  handleFile,
}) {
  const protection = data.documentProtection || {
    enabled: false,
    pin: "",
  };

  return (
    <div className="builder-section-stack">
      <RepeatableSection
        title="Documents & certificates"
        empty="Add certificates, awards, licenses, or other documents that support your professional profile."
        button="Add document"
        onAdd={() => addItem("documents")}
        count={data.documents.length}
      >
        {data.documents.map((item, index) => (
          <article
            className="builder-repeat-card"
            key={index}
          >
            <div className="repeat-card-heading">
              <div>
                <span>
                  Document {index + 1}
                </span>

                <strong>
                  {item.name || "New document"}
                </strong>
              </div>

              <button
                type="button"
                onClick={() =>
                  removeItem("documents", index)
                }
                aria-label={`Remove document ${index + 1}`}
              >
                <Trash2 size={17} />
              </button>
            </div>

            <div className="builder-fields-grid">
              <Field
                label="Document name"
                value={item.name}
                onChange={(value) =>
                  updateItem(
                    "documents",
                    index,
                    "name",
                    value
                  )
                }
                placeholder="e.g. AWS Certified Developer"
                required
                maxLength={200}
                help={`${item.name?.length || 0}/200 characters`}
              />

              <label className="builder-field">
                <span>
                  Document type<b>*</b>
                </span>

                <select
                  value={item.type}
                  onChange={(event) =>
                    updateItem(
                      "documents",
                      index,
                      "type",
                      event.target.value
                    )
                  }
                  required
                >
                  <option value="certificate">Certificate</option>
                  <option value="award">Award</option>
                  <option value="license">License</option>
                  <option value="other">Other</option>
                </select>

                <small>
                  Choose the category that best describes this document.
                </small>
              </label>

              <div className="builder-field-full">
                <div className="builder-upload-card">
                  <div className="builder-upload-icon">
                    <FileText size={22} />
                  </div>

                  <div className="builder-upload-content">
                    <strong>
                      {item.publicId
                        ? "Protected document uploaded"
                        : item.fileUrl
                          ? "Document selected"
                          : "Upload document"}
                    </strong>

                    <p>
                      {item.publicId
                        ? `${item.name || "Document"} is stored as a protected document.`
                        : item.fileUrl
                          ? "Document uploaded"
                          : "PDF, JPG, PNG, DOC or DOCX, up to 10 MB."}
                    </p>
                  </div>

                  <label className="builder-outline builder-upload-button">
                    <Plus size={16} />

                    {item.publicId || item.fileUrl
                      ? "Replace file"
                      : "Choose file"}

                    <input
                      type="file"
                      hidden
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                      onChange={(event) =>
                        handleFile(
                          "documents",
                          index,
                          event
                        )
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          </article>
        ))}
      </RepeatableSection>

      <div className="builder-document-protection-card">
        <div className="builder-document-protection-icon">
          <ShieldCheck size={20} aria-hidden="true" />
        </div>

        <div className="builder-document-protection-content">
          <h3>Protect your public documents</h3>

          <p>
            Visitors will be able to see your document names and details,
            but they will need your 6-digit PIN before they can open the
            actual files. Your resume remains public.
          </p>

          <label className="builder-toggle">
            <input
              type="checkbox"
              checked={Boolean(protection.enabled)}
              onChange={(event) => {
                const enabled = event.target.checked;

                update(
                  "documentProtection.enabled",
                  enabled
                );

                if (!enabled) {
                  update(
                    "documentProtection.pin",
                    ""
                  );
                }
              }}
            />

            <span className="builder-toggle-track">
              <span className="builder-toggle-thumb" />
            </span>

            <strong>
              {protection.enabled
                ? "Protected"
                : "Public access"}
            </strong>
          </label>

          {protection.enabled && protection.pinLength === 4 && (
            <p className="builder-pin-upgrade" role="note">
              Your documents use an older 4-digit PIN. Please set a new
              6-digit PIN below for stronger protection.
            </p>
          )}

          {protection.enabled && (
            <div className="builder-pin-field">
              <label>
                <span>
                  6-digit document PIN<b>*</b>
                </span>

                <input
                  type="password"
                  value={protection.pin || ""}
                  onChange={(event) => {
                    const value = event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6);

                    update(
                      "documentProtection.pin",
                      value
                    );
                  }}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  autoComplete="new-password"
                />

                <small>
                  Visitors need this PIN to open the actual document files.
                </small>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   RESUME
   ========================================================= */

function ResumeSection({ data, update, handleFile }) {
  const resume = data.resume;

  return (
    <div className="builder-section-stack">
      <div className="builder-fields-grid">
        <div className="builder-field-full">
          <Field
            label="Resume name"
            value={resume.name}
            onChange={(value) =>
              update("resume.name", value)
            }
            placeholder="e.g. Mayank Rawat Resume 2026"
            maxLength={200}
            help={`${resume.name?.length || 0}/200 characters`}
          />
        </div>

        <div className="builder-field-full">
          <div className="builder-upload-card builder-resume-upload">
            <div className="builder-upload-icon">
              <FileText size={22} />
            </div>

            <div className="builder-upload-content">
              <strong>
                {resume.fileUrl
                  ? "Resume selected"
                  : "Upload your resume"}
              </strong>

              <p>
                {resume.fileUrl
                  ? resume.fileUrl.startsWith("pending:")
                    ? resume.fileUrl.replace(
                        "pending:",
                        ""
                      )
                    : "Resume uploaded"
                  : "Upload your latest resume. Maximum file size is 10 MB."}
              </p>
            </div>

            <label className="builder-outline builder-upload-button">
              <Plus size={16} />

              {resume.fileUrl
                ? "Replace resume"
                : "Choose resume"}

              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx"
                onChange={(event) =>
                  handleFile(
                    "resume",
                    null,
                    event
                  )
                }
              />
            </label>
          </div>
        </div>
      </div>

      <div className="builder-info-card">
        <div>
          <strong>
            Keep your resume up to date.
          </strong>

          <p>
            Employers can use your portfolio and resume
            together to understand your experience and
            qualifications.
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SOCIAL
   ========================================================= */

function SocialLinksSection({ data, update }) {
  const social = data.socialLinks;

  return (
    <div className="builder-section-stack">
      <div className="builder-fields-grid">
        <div className="builder-field-full">
          <div className="builder-section-intro">
            <div className="builder-section-intro-icon">
              <Globe size={20} />
            </div>

            <div>
              <strong>Connect your professional profiles</strong>
              <p>
                Add links where employers can learn more about
                your work, projects, and professional background.
              </p>
            </div>
          </div>
        </div>

        <Field
          label="LinkedIn"
          value={social.linkedin}
          onChange={(value) =>
            update("socialLinks.linkedin", value)
          }
          placeholder="https://www.linkedin.com/in/your-name"
          type="url"
          help="Optional."
        />

        <Field
          label="GitHub"
          value={social.github}
          onChange={(value) =>
            update("socialLinks.github", value)
          }
          placeholder="https://github.com/your-username"
          type="url"
          help="Optional."
        />

        <Field
          label="Personal website"
          value={social.website}
          onChange={(value) =>
            update("socialLinks.website", value)
          }
          placeholder="https://yourwebsite.com"
          type="url"
          help="Optional."
        />

        <Field
          label="Instagram"
          value={social.instagram}
          onChange={(value) =>
            update("socialLinks.instagram", value)
          }
          placeholder="https://www.instagram.com/your-username"
          type="url"
          help="Optional."
        />
      </div>

      <div className="builder-info-card">
        <div>
          <strong>Only add profiles you're comfortable sharing.</strong>
          <p>
            These links can appear publicly on your portfolio,
            so make sure each profile represents you professionally.
          </p>
        </div>
      </div>
    </div>
  );
}

function SocialField({
  icon,
  label,
  value,
  onChange,
  placeholder,
}) {
  return (
    <label className="builder-social-field">

      <span className="social-text-icon">
        {icon}
      </span>

      <span className="social-field-label">
        <strong>
          {label}
        </strong>

        <small>
          Optional
        </small>
      </span>

      <input
        value={value || ""}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        placeholder={placeholder}
      />

    </label>
  );
}

/* =========================================================
   REPEATABLE SECTION
   ========================================================= */

function RepeatableSection({
  title,
  empty,
  button,
  onAdd,
  children,
  count = 0,
}) {
  return (
    <div className="repeatable-section">

      <div className="repeatable-header">
        <div>
          <h2>{title}</h2>

          <p>
            {count === 0
              ? empty
              : "Add as many entries as you need."}
          </p>
        </div>

        <button
          type="button"
          className="builder-outline"
          onClick={onAdd}
        >
          <Plus size={16} />
          {button}
        </button>
      </div>

      {count > 0 ? (
        <div className="builder-repeatable-list">
          {children}
        </div>
      ) : (
        <div className="builder-empty-state">
          <FileText size={22} />

          <div>
            <strong>
              Nothing added yet
            </strong>

            <p>{empty}</p>
          </div>

          <button
            type="button"
            className="builder-outline"
            onClick={onAdd}
          >
            <Plus size={16} />
            {button}
          </button>
        </div>
      )}

    </div>
  );
}

/* =========================================================
   REVIEW
   ========================================================= */

function ReviewSection({
  data,
  progress,
  onEdit,
}) {
  const sections = [
    {
      id: "profile",
      title: "Profile",
      value: data.profile.name || "Not added",
    },
    {
      id: "hero",
      title: "Headline",
      value: data.hero.headline || "Not added",
    },
    {
      id: "about",
      title: "About",
      value: data.about.description
        ? `${data.about.description.slice(0, 90)}${
            data.about.description.length > 90
              ? "…"
              : ""
          }`
        : "Not added",
    },
    {
      id: "experience",
      title: "Experience",
      value: `${data.experience.length} ${
        data.experience.length === 1
          ? "entry"
          : "entries"
      }`,
    },
    {
      id: "education",
      title: "Education",
      value: `${data.education.length} ${
        data.education.length === 1
          ? "entry"
          : "entries"
      }`,
    },
    {
      id: "skills",
      title: "Skills",
      value: `${data.skills.length} ${
        data.skills.length === 1
          ? "skill"
          : "skills"
      }`,
    },
    {
      id: "documents",
      title: "Documents",
      value: `${data.documents.length} ${
        data.documents.length === 1
          ? "document"
          : "documents"
      }`,
    },
    {
      id: "resume",
      title: "Resume",
      value: data.resume.name || "Not added",
    },
    {
      id: "social",
      title: "Social links",
      value: `${
        Object.values(data.socialLinks)
          .filter(isNonEmpty)
          .length
      } added`,
    },
  ];

  const incompleteSections = sections.filter(
    (section) =>
      !sectionComplete(data, section.id)
  );

  const isComplete =
    incompleteSections.length === 0;

  return (
    <div className="builder-review">

      <div
        className={`review-completion ${
          isComplete
            ? "review-completion-complete"
            : ""
        }`}
      >
        <div className="review-ring">
          <strong>{progress}%</strong>
          <span>complete</span>
        </div>

        <div className="review-completion-copy">
          <h2>
            {isComplete
              ? "Your portfolio is ready"
              : "One final check"}
          </h2>

          <p>
            {isComplete
              ? "Everything required for your portfolio has been completed. Review your information once more before continuing."
              : `You still have ${incompleteSections.length} ${
                  incompleteSections.length === 1
                    ? "section"
                    : "sections"
                } to complete.`}
          </p>
        </div>
      </div>

      {!isComplete && (
        <div className="review-warning">
          <strong>Complete the remaining sections</strong>

          <p>
            Click any incomplete section below to go
            back and finish it.
          </p>
        </div>
      )}

      <div className="review-grid">
        {sections.map((section) => {
          const complete = sectionComplete(
            data,
            section.id
          );

          return (
            <ReviewCard
              key={section.id}
              title={section.title}
              complete={complete}
              value={section.value}
              onEdit={() => onEdit(section.id)}
            />
          );
        })}
      </div>

      {isComplete && (
        <div className="review-ready-card">
          <Check size={20} />

          <div>
            <strong>Everything looks good.</strong>

            <p>
              Your portfolio will be saved as a draft.
              You can manage and publish it from the
              dashboard.
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

function ReviewCard({
  title,
  complete,
  value,
  onEdit,
}) {
  return (
    <button
      type="button"
      className={`review-card ${
        complete ? "complete" : ""
      }`}
      onClick={onEdit}
    >
      <span className="review-status">
        {complete && <Check size={13} />}
      </span>

      <div className="review-card-content">
        <strong>{title}</strong>

        <p>{value}</p>
      </div>

      <span className="review-edit">
        Edit
      </span>
    </button>
  );
}