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
  protectionEnabled = false,
  portfolioSlug = "",
  pinLength = null,
}) {
  // New PINs have 6 digits; older portfolios may still use 4.
  const expectedLength =
    pinLength === 4 || pinLength === 6 ? pinLength : null;
  const pinLabel = expectedLength
    ? `${expectedLength}-digit`
    : "4- or 6-digit";

  const [pin, setPin] = useState("");

  const [unlocked, setUnlocked] = useState(
    !protectionEnabled
  );

  const [unlocking, setUnlocking] =
    useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const hasDocuments =
    Array.isArray(data) &&
    data.length > 0;

  /*
   * If protection is disabled,
   * documents are immediately accessible.
   */
  React.useEffect(() => {
    if (!protectionEnabled) {
      setUnlocked(true);
      setPin("");
      setError("");
      setSuccess("");
    } else {
      setUnlocked(false);
    }
  }, [protectionEnabled]);

  async function unlockDocuments(event) {
    event.preventDefault();

    if (!protectionEnabled) {
      setUnlocked(true);
      return;
    }

    if (!portfolioSlug) {
      setError("Portfolio link is unavailable.");
      return;
    }

    const validPin = expectedLength
      ? pin.length === expectedLength && /^\d+$/.test(pin)
      : /^(\d{4}|\d{6})$/.test(pin);

    if (!validPin) {
      setError(
        `Please enter your ${pinLabel} PIN.`
      );
      return;
    }

    setUnlocking(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/portfolios/${encodeURIComponent(
          portfolioSlug
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
        result = await response.json();
      } catch {
        result = {};
      }

      /*
       * IMPORTANT:
       *
       * Never consider a PIN correct unless
       * the backend explicitly returns success.
       */
      if (!response.ok) {
        throw new Error(
          result.message ||
            "Incorrect PIN."
        );
      }

      if (result.unlocked !== true) {
        throw new Error(
          "Unable to unlock documents."
        );
      }

      setUnlocked(true);

      setSuccess(
        "Documents unlocked for 15 minutes."
      );

      setPin("");
    } catch (unlockError) {
      setUnlocked(false);

      setError(
        unlockError.message ||
          "Incorrect PIN."
      );
    } finally {
      setUnlocking(false);
    }
  }

  function getDocumentUrl(document) {
    if (!portfolioSlug || !document?._id) {
      return "#";
    }

    return `/api/portfolios/${encodeURIComponent(
      portfolioSlug
    )}/documents/${encodeURIComponent(
      document._id
    )}`;
  }

  return (
    <section
      id="documents"
      className="portfolio-section"
    >
      <SectionTitle title="Documents" />

      {protectionEnabled && (
        <p className="wf-seal portfolio-seal">
          <img
            src="/maple-leaf.png"
            alt=""
            width="16"
            height="16"
          />
          Protected documents
        </p>
      )}

      {!hasDocuments ? (
        <div className="documents-empty">
          <p>
            No documents have been shared in
            this portfolio yet.
          </p>
        </div>
      ) : (
        <>
          <ul className="documents-grid">
            {data.map(
              (document, index) => (
                <li
                  className="document-card"
                  key={
                    document._id ||
                    index
                  }
                >
                  <FileText
                    className="document-icon"
                    size={22}
                    aria-hidden="true"
                  />

                  <div className="document-content">
                    <h3>
                      {document.name ||
                        "Document"}
                    </h3>

                    <p className="document-meta">
                      <span>
                        {document.type ||
                          "Document"}
                      </span>

                      {document.size && (
                        <span>
                          {document.size}
                        </span>
                      )}
                    </p>
                  </div>

                  {unlocked ? (
                    <a
                      href={getDocumentUrl(
                        document
                      )}
                      className="btn btn-secondary btn-sm"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View
                      <span className="sr-only">
                        {" "}
                        {document.name ||
                          "document"}
                      </span>
                    </a>
                  ) : (
                    <span className="document-locked">
                      <Lock
                        size={14}
                        aria-hidden="true"
                      />
                      Locked
                    </span>
                  )}
                </li>
              )
            )}
          </ul>

          {protectionEnabled &&
            !unlocked && (
              <div className="document-pin-card">
                <h3>
                  Enter the PIN to open these
                  documents
                </h3>

                <p>
                  The candidate shares this PIN
                  with employers. You can see the
                  list above; the files open after
                  you enter it.
                </p>

                <form
                  className="document-pin-form"
                  onSubmit={
                    unlockDocuments
                  }
                >
                  <input
                    className="input"
                    type="password"
                    value={pin}
                    onChange={(event) => {
                      const value =
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, expectedLength || 6);

                      setPin(value);
                      setError("");
                    }}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={expectedLength || 6}
                    placeholder={expectedLength === 4 ? "••••" : "••••••"}
                    aria-label={`${pinLabel} document PIN`}
                  />

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      unlocking ||
                      !(expectedLength
                        ? pin.length === expectedLength
                        : pin.length === 4 || pin.length === 6)
                    }
                  >
                    {unlocking
                      ? "Checking..."
                      : "Unlock documents"}
                  </button>
                </form>

                {error && (
                  <p
                    className="document-pin-message document-pin-error"
                    role="alert"
                  >
                    <AlertCircle
                      size={16}
                      aria-hidden="true"
                    />

                    <span>
                      {error}
                    </span>
                  </p>
                )}

                {success && (
                  <p className="document-pin-message document-pin-success">
                    <CheckCircle2
                      size={16}
                      aria-hidden="true"
                    />

                    <span>
                      {success}
                    </span>
                  </p>
                )}
              </div>
            )}

          {protectionEnabled &&
            unlocked && (
              <p className="document-unlocked-banner">
                <CheckCircle2
                  size={18}
                  aria-hidden="true"
                />

                <span>
                  Documents unlocked. Access
                  ends automatically after 15
                  minutes.
                </span>
              </p>
            )}
        </>
      )}
    </section>
  );
}
