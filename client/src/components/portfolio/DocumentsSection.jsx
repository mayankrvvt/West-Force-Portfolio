import React, { useState } from "react";
import {
  Lock,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import SectionTitle from "./SectionTitle";

export default function DocumentsSection({
  data = [],
}) {
  const [pin, setPin] = useState("");

  const [unlocked, setUnlocked] =
    useState(false);

  const [unlocking, setUnlocking] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const hasDocuments =
    Array.isArray(data) &&
    data.length > 0;

  async function unlockDocuments(
    event
  ) {
    event.preventDefault();

    if (!/^\d{4}$/.test(pin)) {
      setError(
        "Please enter your 4-digit PIN."
      );
      return;
    }

    setUnlocking(true);
    setError("");
    setSuccess("");

    try {
      const slug =
        window.location.pathname
          .split("/")
          .filter(Boolean)
          .at(-1);

      const response =
        await fetch(
          `/api/portfolios/${encodeURIComponent(
            slug
          )}/unlock-documents`,
          {
            method: "POST",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              pin,
            }),
          }
        );

      let result = {};

      try {
        result =
          await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Unable to unlock documents."
        );
      }

      setUnlocked(true);

      setSuccess(
        "Documents unlocked for 15 minutes."
      );

      setPin("");
    } catch (unlockError) {
      setError(
        unlockError.message ||
          "Incorrect PIN."
      );
    } finally {
      setUnlocking(false);
    }
  }

  function getDocumentUrl(document) {
    if (!document?._id) {
      return "#";
    }

    const slug =
      window.location.pathname
        .split("/")
        .filter(Boolean)
        .at(-1);

    return `/api/portfolios/${encodeURIComponent(
      slug
    )}/documents/${encodeURIComponent(
      document._id
    )}`;
  }

  return (
    <section
      id="documents"
      className="portfolio-section"
    >
      <SectionTitle
        eyebrow="DOCUMENTS"
        title="My Documents"
        description="Verified documents and professional credentials."
      />

      {!hasDocuments ? (
        <div className="documents-empty">
          <FileText size={28} />

          <h3>
            No documents available
          </h3>

          <p>
            There are currently no public
            documents in this portfolio.
          </p>
        </div>
      ) : (
        <>
          <div className="documents-grid">
            {data.map(
              (document, index) => (
                <div
                  className="document-card"
                  key={
                    document._id ||
                    index
                  }
                >
                  <div className="document-icon">
                    <FileText size={22} />
                  </div>

                  <div className="document-content">
                    <h3>
                      {document.name ||
                        "Document"}
                    </h3>

                    <p>
                      {document.type ||
                        "Document"}

                      {document.size
                        ? ` · ${document.size}`
                        : ""}
                    </p>
                  </div>

                  {unlocked ? (
                    <a
                      href={getDocumentUrl(
                        document
                      )}
                      className="document-button"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View
                    </a>
                  ) : (
                    <span className="document-button document-button-locked">
                      <Lock size={14} />
                      Locked
                    </span>
                  )}
                </div>
              )
            )}
          </div>

          {!unlocked && (
            <div className="document-pin-card">
              <div className="document-pin-icon">
                <Lock size={22} />
              </div>

              <div className="document-pin-content">
                <span className="document-pin-eyebrow">
                  PRIVATE DOCUMENTS
                </span>

                <h3>
                  Enter the PIN to access
                  documents
                </h3>

                <p>
                  You can see the document
                  information above, but the
                  files themselves are protected.
                </p>

                <form
                  className="document-pin-form"
                  onSubmit={
                    unlockDocuments
                  }
                >
                  <input
                    type="password"
                    value={pin}
                    onChange={(event) => {
                      const value =
                        event.target.value
                          .replace(
                            /\D/g,
                            ""
                          )
                          .slice(0, 4);

                      setPin(value);
                      setError("");
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={4}
                    placeholder="••••"
                    aria-label="4-digit document PIN"
                  />

                  <button
                    type="submit"
                    disabled={
                      unlocking ||
                      pin.length !== 4
                    }
                  >
                    {unlocking
                      ? "Checking..."
                      : "Unlock documents"}
                  </button>
                </form>

                {error && (
                  <div
                    className="document-pin-message document-pin-error"
                    role="alert"
                  >
                    <AlertCircle
                      size={16}
                    />

                    <span>
                      {error}
                    </span>
                  </div>
                )}

                {success && (
                  <div className="document-pin-message document-pin-success">
                    <CheckCircle2
                      size={16}
                    />

                    <span>
                      {success}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {unlocked && (
            <div className="document-unlocked-banner">
              <CheckCircle2 size={18} />

              <span>
                Documents unlocked. Access
                will automatically expire
                after 15 minutes.
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
}