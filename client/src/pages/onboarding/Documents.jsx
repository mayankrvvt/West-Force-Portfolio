import { useState } from "react";
import {
  Award,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  GraduationCap,
  Languages,
  Lock,
  Plane,
  Upload,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
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

  // ---------------------------------------
  // DOCUMENT PIN
  // ---------------------------------------

  const [documentPin, setDocumentPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] =
    useState(false);

  const [pinEnabled, setPinEnabled] =
    useState(false);

  const [pinError, setPinError] = useState("");

  // ---------------------------------------
  // UPLOAD
  // ---------------------------------------

  const handleUpload = (id, event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      setPinError("");
      alert("Document must be smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    setDocuments((previous) => ({
      ...previous,
      [id]: file,
    }));

    event.target.value = "";
  };

  // ---------------------------------------
  // REMOVE DOCUMENT
  // ---------------------------------------

  const handleRemove = (id) => {
    setDocuments((previous) => {
      const updated = { ...previous };

      delete updated[id];

      return updated;
    });
  };

  // ---------------------------------------
  // PIN VALIDATION
  // ---------------------------------------

  const validatePin = () => {
    setPinError("");

    if (!/^\d{4}$/.test(documentPin)) {
      setPinError(
        "Your PIN must contain exactly 4 digits."
      );

      return false;
    }

    if (!/^\d{4}$/.test(confirmPin)) {
      setPinError(
        "Please confirm your 4-digit PIN."
      );

      return false;
    }

    if (documentPin !== confirmPin) {
      setPinError("PINs do not match.");

      return false;
    }

    return true;
  };

  // ---------------------------------------
  // ENABLE / UPDATE PIN
  // ---------------------------------------

  const handleEnablePin = () => {
    if (!validatePin()) return;

    setPinEnabled(true);
    setPinError("");
  };

  // ---------------------------------------
  // REMOVE PIN PROTECTION
  // ---------------------------------------

  const handleDisablePin = () => {
    setDocumentPin("");
    setConfirmPin("");
    setPinEnabled(false);
    setPinError("");
  };

  // ---------------------------------------
  // PIN INPUT
  // ---------------------------------------

  const handlePinChange = (value, setter) => {
    const digitsOnly = value
      .replace(/\D/g, "")
      .slice(0, 4);

    setter(digitsOnly);

    if (pinError) {
      setPinError("");
    }
  };

  const uploadedCount =
    Object.keys(documents).length;

  return (
    <div className="documents-page">

      {/* =====================================
          PAGE HEADER
      ====================================== */}

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

      {/* =====================================
          DOCUMENT CARDS
      ====================================== */}

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
                    file ? "uploaded" : ""
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

                <p>
                  {document.description}
                </p>
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

      {/* =====================================
          DOCUMENT PIN SECURITY
      ====================================== */}

      <div
        className={`documents-pin-card ${
          pinEnabled
            ? "documents-pin-card-enabled"
            : ""
        }`}
      >
        {/* PIN HEADER */}

        <div className="documents-pin-header">

          <div className="documents-pin-icon">
            {pinEnabled ? (
              <ShieldCheck
                size={22}
                strokeWidth={1.8}
              />
            ) : (
              <Lock
                size={22}
                strokeWidth={1.8}
              />
            )}
          </div>

          <div className="documents-pin-title">
            <h3>
              Protect your documents
            </h3>

            <p>
              Require a 4-digit PIN before
              visitors can view documents
              on your public portfolio.
            </p>
          </div>

          {pinEnabled && (
            <div className="documents-pin-status">
              <CheckCircle2 size={15} />
              Protected
            </div>
          )}
        </div>

        {/* PIN FORM */}

        {!pinEnabled ? (
          <>
            <div className="documents-pin-form">

              {/* PIN */}

              <div className="documents-pin-field">
                <label htmlFor="document-pin">
                  Document access PIN
                </label>

                <div className="documents-pin-input">
                  <input
                    id="document-pin"
                    type={
                      showPin
                        ? "text"
                        : "password"
                    }
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={4}
                    placeholder="••••"
                    value={documentPin}
                    onChange={(event) =>
                      handlePinChange(
                        event.target.value,
                        setDocumentPin
                      )
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPin(
                        (value) => !value
                      )
                    }
                    aria-label={
                      showPin
                        ? "Hide PIN"
                        : "Show PIN"
                    }
                  >
                    {showPin ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                <span>
                  Enter exactly 4 digits.
                </span>
              </div>

              {/* CONFIRM PIN */}

              <div className="documents-pin-field">
                <label htmlFor="confirm-document-pin">
                  Confirm PIN
                </label>

                <div className="documents-pin-input">
                  <input
                    id="confirm-document-pin"
                    type={
                      showConfirmPin
                        ? "text"
                        : "password"
                    }
                    inputMode="numeric"
                    autoComplete="new-password"
                    maxLength={4}
                    placeholder="••••"
                    value={confirmPin}
                    onChange={(event) =>
                      handlePinChange(
                        event.target.value,
                        setConfirmPin
                      )
                    }
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPin(
                        (value) => !value
                      )
                    }
                    aria-label={
                      showConfirmPin
                        ? "Hide PIN"
                        : "Show PIN"
                    }
                  >
                    {showConfirmPin ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                <span>
                  Visitors will need this PIN.
                </span>
              </div>

              {/* ENABLE */}

              <button
                type="button"
                className="documents-pin-enable"
                onClick={handleEnablePin}
              >
                <Lock size={17} />

                Enable PIN protection
              </button>
            </div>

            {pinError && (
              <div className="documents-pin-error">
                {pinError}
              </div>
            )}
          </>
        ) : (
          /* =================================
             ENABLED STATE
          ================================== */

          <div className="documents-pin-enabled">

            <div className="documents-pin-enabled-info">
              <div className="documents-pin-success-icon">
                <CheckCircle2 size={18} />
              </div>

              <div>
                <strong>
                  Your documents are PIN protected
                </strong>

                <p>
                  Visitors must enter your
                  4-digit PIN before they can
                  access your documents.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="documents-pin-change"
              onClick={handleDisablePin}
            >
              Change PIN
            </button>
          </div>
        )}
      </div>

      {/* =====================================
          SECURITY MESSAGE
      ====================================== */}

      <div className="documents-security">
        <div className="documents-security-icon">
          <ShieldCheck size={21} />
        </div>

        <div>
          <h3>
            Your documents are protected
          </h3>

          <p>
            Your documents will be securely
            associated with your professional
            portfolio and can be used for
            employer verification.
          </p>
        </div>
      </div>
    </div>
  );
}