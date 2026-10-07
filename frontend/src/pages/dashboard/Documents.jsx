import { useRef, useState } from "react";
import {
  Upload,
  FileText,
  GraduationCap,
  Globe,
  BriefcaseBusiness,
  ShieldCheck,
  Languages,
  Award,
  CheckCircle2,
  X,
} from "lucide-react";

const DOCUMENT_TYPES = [
  {
    id: "school",
    title: "10th–12th Certificate",
    description: "Secondary and higher-secondary certificates",
    icon: GraduationCap,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    id: "bachelor",
    title: "Bachelor Degree Certificate",
    description: "Degree certificate and academic documents",
    icon: GraduationCap,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    id: "wes",
    title: "WES Report",
    description: "World Education Services evaluation report",
    icon: Globe,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    id: "experience",
    title: "Work Experience",
    description: "Experience letters and employment records",
    icon: BriefcaseBusiness,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    id: "training",
    title: "Training Documents",
    description: "Training, internship and course certificates",
    icon: Award,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    id: "passport",
    title: "Passport",
    description: "Passport identification page",
    icon: ShieldCheck,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
  {
    id: "ielts",
    title: "IELTS",
    description: "IELTS test report form",
    icon: Languages,
    accept: ".pdf,.jpg,.jpeg,.png",
  },
];

const STORAGE_KEY = "westforce_documents";

export default function Documents() {
  const [documents, setDocuments] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );
    } catch {
      return {};
    }
  });

  const [activeUpload, setActiveUpload] = useState(null);
  const inputRef = useRef(null);

  const handleUploadClick = (documentId) => {
    setActiveUpload(documentId);

    setTimeout(() => {
      inputRef.current?.click();
    }, 0);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file || !activeUpload) {
      return;
    }

    const updatedDocuments = {
      ...documents,
      [activeUpload]: {
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      },
    };

    setDocuments(updatedDocuments);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedDocuments)
    );

    event.target.value = "";
    setActiveUpload(null);
  };

  const handleRemove = (documentId) => {
    const updatedDocuments = {
      ...documents,
    };

    delete updatedDocuments[documentId];

    setDocuments(updatedDocuments);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updatedDocuments)
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes) {
      return "";
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const uploadedCount = Object.keys(documents).length;

  return (
    <div className="documents-page">
      <div className="documents-header">
        <div>
          <p className="documents-kicker">
            DOCUMENT CENTER
          </p>

          <h2>Your documents</h2>

          <p className="documents-description">
            Upload and manage the documents required for
            your professional profile and employer
            verification.
          </p>
        </div>

        <div className="documents-progress">
          <strong>
            {uploadedCount}/{DOCUMENT_TYPES.length}
          </strong>

          <span>Documents uploaded</span>
        </div>
      </div>

      <div className="documents-grid">
        {DOCUMENT_TYPES.map((document) => {
          const Icon = document.icon;
          const uploaded = documents[document.id];

          return (
            <article
              className={`document-upload-card ${
                uploaded ? "document-uploaded" : ""
              }`}
              key={document.id}
            >
              <div className="document-card-top">
                <div className="document-card-icon">
                  <Icon size={24} strokeWidth={1.8} />
                </div>

                {uploaded && (
                  <span className="document-status">
                    <CheckCircle2 size={14} />
                    Uploaded
                  </span>
                )}
              </div>

              <div className="document-card-content">
                <h3>{document.title}</h3>

                <p>{document.description}</p>
              </div>

              {uploaded ? (
                <div className="document-file">
                  <div className="document-file-info">
                    <FileText size={18} />

                    <div>
                      <strong>
                        {uploaded.name}
                      </strong>

                      <span>
                        {formatFileSize(
                          uploaded.size
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="document-file-actions">
                    <button
                      type="button"
                      onClick={() =>
                        handleUploadClick(
                          document.id
                        )
                      }
                      className="document-change-button"
                    >
                      Replace
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleRemove(
                          document.id
                        )
                      }
                      className="document-remove-button"
                      aria-label={`Remove ${document.title}`}
                    >
                      <X size={17} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="document-upload-button"
                  onClick={() =>
                    handleUploadClick(
                      document.id
                    )
                  }
                >
                  <Upload size={17} />
                  Upload document
                </button>
              )}
            </article>
          );
        })}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileChange}
        hidden
      />

      <div className="documents-note">
        <ShieldCheck size={19} />

        <div>
          <strong>Document security</strong>

          <p>
            Your documents are stored locally for now.
            Secure cloud storage and document verification
            will be connected when the backend is added.
          </p>
        </div>
      </div>
    </div>
  );
}