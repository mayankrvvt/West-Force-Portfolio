import { useState } from "react";
import {
  Award,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  GraduationCap,
  Languages,
  Plane,
  Upload,
  X,
} from "lucide-react";

const documentTypes = [
  {
    id: "school",
    title: "10th–12th Certificate",
    description:
      "Upload your 10th and 12th certificates or marksheets.",
    icon: GraduationCap,
  },
  {
    id: "degree",
    title: "Bachelor Degree Certificate",
    description:
      "Upload your bachelor's degree certificate and supporting documents.",
    icon: Award,
  },
  {
    id: "wes",
    title: "WES Report",
    description:
      "Upload your WES educational credential assessment report.",
    icon: FileText,
  },
  {
    id: "experience",
    title: "Work Experience",
    description:
      "Upload experience letters, employment certificates or reference documents.",
    icon: BriefcaseBusiness,
  },
  {
    id: "training",
    title: "Training Documents",
    description:
      "Upload your training certificates and professional development documents.",
    icon: BookOpen,
  },
  {
    id: "passport",
    title: "Passport",
    description:
      "Upload a clear copy of your valid passport.",
    icon: Plane,
  },
  {
    id: "ielts",
    title: "IELTS",
    description:
      "Upload your IELTS test report form or language test certificate.",
    icon: Languages,
  },
];

export default function Documents() {
  const [documents, setDocuments] = useState({});

  const handleUpload = (id, event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setDocuments((previous) => ({
      ...previous,
      [id]: file,
    }));

    event.target.value = "";
  };

  const handleRemove = (id) => {
    setDocuments((previous) => {
      const updated = { ...previous };
      delete updated[id];
      return updated;
    });
  };

  const uploadedCount =
    Object.keys(documents).length;

  return (
    <div className="documents-page">
      {/* PAGE HEADER */}

      <div className="documents-page-header">
        <div>
          <p className="documents-eyebrow">
            DOCUMENT CENTER
          </p>

          <h2>Your documents</h2>

          <p>
            Upload and manage the documents required
            for your professional portfolio and
            employer applications.
          </p>
        </div>

        <div className="documents-counter">
          <strong>
            {uploadedCount}/{documentTypes.length}
          </strong>

          <span>Uploaded</span>
        </div>
      </div>

      {/* DOCUMENT CARDS */}

      <div className="documents-grid">
        {documentTypes.map((document) => {
          const Icon = document.icon;
          const file = documents[document.id];

          return (
            <div
              className={`document-card ${
                file
                  ? "document-card-uploaded"
                  : ""
              }`}
              key={document.id}
            >
              {/* TOP */}

              <div className="document-card-top">
                <div className="document-card-icon">
                  <Icon
                    size={24}
                    strokeWidth={1.8}
                  />
                </div>

                <span
                  className={`document-card-status ${
                    file
                      ? "uploaded"
                      : ""
                  }`}
                >
                  {file ? (
                    <>
                      <CheckCircle2 size={13} />
                      Uploaded
                    </>
                  ) : (
                    "Required"
                  )}
                </span>
              </div>

              {/* CONTENT */}

              <div className="document-card-body">
                <h3>{document.title}</h3>

                <p>{document.description}</p>
              </div>

              {/* UPLOAD / FILE */}

              {file ? (
                <div className="document-selected-file">
                  <div className="document-file-name">
                    <FileText size={17} />

                    <span title={file.name}>
                      {file.name}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleRemove(
                        document.id
                      )
                    }
                    aria-label={`Remove ${document.title}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <label className="document-upload">
                  <Upload size={17} />

                  <span>
                    Upload document
                  </span>

                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) =>
                      handleUpload(
                        document.id,
                        event
                      )
                    }
                  />
                </label>
              )}

              {/* FOOTER */}

              <div className="document-card-footer">
                <span>PDF, JPG or PNG</span>

                <span>Max 10 MB</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* SECURITY MESSAGE */}

      <div className="documents-security">
        <div className="documents-security-icon">
          <CheckCircle2 size={21} />
        </div>

        <div>
          <h3>Your documents are protected</h3>

          <p>
            Your documents will be securely associated
            with your professional portfolio and can be
            used for employer verification.
          </p>
        </div>
      </div>
    </div>
  );
}