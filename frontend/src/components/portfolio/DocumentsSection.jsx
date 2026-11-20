import React, { useEffect, useState } from "react";

import {
  Award,
  Clock,
  Lock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Mail,
} from "lucide-react";

import SectionTitle from "./SectionTitle";
import MapleLeaf from "../brand/MapleLeaf";
import { DEMO_MODE } from "../../demo/demoMode";

const TYPE_LABELS = {
  certificate: "Certificate",
  certification: "Certificate",
  "work-permit": "Work permit",
  reference: "Reference",
  license: "Licence",
  licence: "Licence",
  transcript: "Transcript",
  resume: "Resume",
};

function typeLabel(type = "") {
  const key = String(type).toLowerCase();

  if (TYPE_LABELS[key]) return TYPE_LABELS[key];
  if (!key || key === "document") return "Document";
  if (key.length <= 4) return key.toUpperCase();

  const text = key.replace(/[-_]+/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isCertificate(document) {
  return /certific/i.test(String(document?.type || ""));
}

function waitText(seconds) {
  if (!seconds || seconds <= 60) return "a minute";
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minutes`;
}

export default function DocumentsSection({
  data = [],
  protectionEnabled = false,
  portfolioSlug = "",
  pinLength = null,
  candidateName = "",
  candidateEmail = "",
}) {
  // New PINs have 6 digits; older portfolios may still use 4.
  const expectedLength =
    pinLength === 4 || pinLength === 6 ? pinLength : null;
  const pinLabel = expectedLength
    ? `${expectedLength}-digit`
    : "4 or 6 digit";

  const [pin, setPin] = useState("");

  const [unlocked, setUnlocked] = useState(
    !protectionEnabled
  );

  const [unlocking, setUnlocking] =
    useState(false);

  const [error, setError] = useState("");

  // "wrong", "locked" or "" so the message can look right
  const [errorKind, setErrorKind] = useState("");

  // While the server has paused PIN tries, keep the button off
  const [lockedUntil, setLockedUntil] = useState(0);

  const [success, setSuccess] = useState("");

  const hasDocuments =
    Array.isArray(data) &&
    data.length > 0;

  const firstName =
    String(candidateName || "").trim().split(/\s+/)[0] || "";

  // A ready made email asking for the PIN; never holds the PIN itself
  const email = String(candidateEmail || "").trim();
  const askPinHref = email
    ? `mailto:${email}?subject=${encodeURIComponent(
        "PIN for your portfolio"
      )}&body=${encodeURIComponent(
        `Hi ${firstName || "there"},\n\nI'm looking at your portfolio and would like to see your documents. Could you send me the PIN?\n\nThank you.`
      )}`
    : "";

  /*
   * If protection is disabled,
   * documents are immediately accessible.
   */
  useEffect(() => {
    if (!protectionEnabled) {
      setUnlocked(true);
      setPin("");
      setError("");
      setErrorKind("");
      setSuccess("");
    } else {
      setUnlocked(false);
    }
  }, [protectionEnabled]);

  // Lift the pause when the wait is over
  useEffect(() => {
    if (!lockedUntil) return undefined;

    const timer = setTimeout(() => {
      setLockedUntil(0);
      setError("");
      setErrorKind("");
    }, Math.max(0, lockedUntil - Date.now()));

    return () => clearTimeout(timer);
  }, [lockedUntil]);

  const isLocked = lockedUntil > 0;

  async function unlockDocuments(event) {
    event.preventDefault();

    if (!protectionEnabled) {
      setUnlocked(true);
      return;
    }

    if (!portfolioSlug) {
      setError("This portfolio link is not available right now.");
      setErrorKind("");
      return;
    }

    const validPin = expectedLength
      ? pin.length === expectedLength && /^\d+$/.test(pin)
      : /^(\d{4}|\d{6})$/.test(pin);

    if (!validPin) {
      setError(`Enter the ${pinLabel} PIN.`);
      setErrorKind("");
      return;
    }

    setUnlocking(true);
    setError("");
    setErrorKind("");
    setSuccess("");

    try {
      // Demo mode has no server: the demo check accepts 123456 and answers
      // like the real API. The literal import.meta.env.DEV check lets Vite drop
      // this branch per file. DEMO_MODE alone is folded later by Rollup, which
      // still marks the destructured export as used and emits a demo chunk.
      let response;
      if (import.meta.env.DEV && DEMO_MODE) {
        const { demoUnlockResponse } = await import("../../demo/demoInsights");
        response = demoUnlockResponse(pin);
      } else response = await fetch(
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
        const failure = new Error(
          result.message ||
            "Incorrect PIN."
        );
        failure.status = response.status;
        failure.attemptsRemaining = result.attemptsRemaining;
        failure.retryAfter = result.retryAfter;
        throw failure;
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

      if (unlockError.status === 429) {
        const seconds = Number(unlockError.retryAfter) || 0;

        setErrorKind("locked");
        setPin("");
        setLockedUntil(Date.now() + Math.max(seconds, 30) * 1000);
        setError(
          `Too many wrong PINs. For safety, try again in ${waitText(seconds)}.`
        );
      } else if (unlockError.status === 401) {
        const left = Number(unlockError.attemptsRemaining);

        setErrorKind("wrong");
        setPin("");
        setError(
          Number.isFinite(left) && left >= 0
            ? `That PIN is not right. ${left} ${
                left === 1 ? "try" : "tries"
              } left before a short pause.`
            : "That PIN is not right. Check it and try again."
        );
      } else if (!unlockError.status || unlockError.status >= 500) {
        setErrorKind("");
        setError(
          "We could not check the PIN just now. Try again in a moment."
        );
      } else {
        setErrorKind("wrong");
        setError(
          unlockError.message ||
            "Incorrect PIN."
        );
      }
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

  const certificates = hasDocuments ? data.filter(isCertificate) : [];
  const otherDocuments = hasDocuments
    ? data.filter((document) => !isCertificate(document))
    : [];

  const groups = [
    { key: "certificates", title: "Certificates", items: certificates },
    {
      key: "other",
      title: certificates.length ? "Other documents" : "",
      items: otherDocuments,
    },
  ].filter((group) => group.items.length > 0);

  const canSubmit =
    !unlocking &&
    !isLocked &&
    (expectedLength
      ? pin.length === expectedLength
      : pin.length === 4 || pin.length === 6);

  function renderCard(document, index) {
    const certificate = isCertificate(document);

    return (
      <li
        className={`document-card ${certificate ? "is-certificate" : ""}`}
        key={document._id || index}
      >
        <span className="document-icon" aria-hidden="true">
          {certificate ? <Award size={20} /> : <FileText size={20} />}
        </span>

        <div className="document-content">
          <h4>{document.name || "Document"}</h4>

          <p className="document-meta">
            <span>{typeLabel(document.type)}</span>
            {document.size && <span>{document.size}</span>}
          </p>
        </div>

        {unlocked ? (
          <a
            href={getDocumentUrl(document)}
            className="btn btn-secondary btn-sm document-open"
            target="_blank"
            rel="noreferrer"
          >
            View
            <span className="sr-only">
              {" "}
              {document.name || "document"}
            </span>
          </a>
        ) : (
          <span className="document-locked">
            <Lock size={14} aria-hidden="true" />
            Locked
          </span>
        )}
      </li>
    );
  }

  return (
    <section
      id="documents"
      className="portfolio-section"
    >
      <SectionTitle title="Documents" />

      <div className="portfolio-section-body">
        {!hasDocuments ? (
          <p className="documents-empty">
            No documents have been shared in this portfolio yet.
          </p>
        ) : (
          <>
            {protectionEnabled && !unlocked && (
              <div className="document-pin-card">
                <div className="document-pin-intro">
                  <p className="wf-seal portfolio-seal">
                    <MapleLeaf width="16" height="16" />
                    PIN protected
                  </p>

                  <h3>Enter the PIN to open these documents</h3>

                  <p>
                    {firstName || "The candidate"} shares this PIN with
                    employers. You can see the list below now; the files
                    open once the PIN is entered. If you don't have it yet,
                    ask {firstName || "the candidate"}.
                  </p>

                  {askPinHref && (
                    <a className="btn document-pin-ask" href={askPinHref}>
                      <Mail size={18} aria-hidden="true" />
                      Ask for the PIN
                    </a>
                  )}
                </div>

                <form
                  className="document-pin-form"
                  onSubmit={unlockDocuments}
                  noValidate
                >
                  <label
                    className="document-pin-label"
                    htmlFor="portfolio-document-pin"
                  >
                    {pinLabel} PIN
                  </label>

                  <div className="document-pin-row">
                    <input
                      id="portfolio-document-pin"
                      className={`input document-pin-input ${
                        errorKind ? "has-error" : ""
                      }`}
                      type="password"
                      value={pin}
                      onChange={(event) => {
                        const value =
                          event.target.value
                            .replace(/\D/g, "")
                            .slice(0, expectedLength || 6);

                        setPin(value);
                        if (!isLocked) {
                          setError("");
                          setErrorKind("");
                        }
                      }}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={expectedLength || 6}
                      placeholder={expectedLength === 4 ? "••••" : "••••••"}
                      aria-invalid={errorKind ? "true" : undefined}
                      aria-describedby={
                        error ? "portfolio-document-pin-message" : undefined
                      }
                      disabled={isLocked}
                    />

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={!canSubmit}
                    >
                      {unlocking
                        ? "Checking..."
                        : "Unlock documents"}
                    </button>
                  </div>

                  {error && (
                    <p
                      id="portfolio-document-pin-message"
                      className={`document-pin-message document-pin-error ${
                        errorKind === "locked" ? "is-locked" : ""
                      }`}
                      role="alert"
                    >
                      {errorKind === "locked" ? (
                        <Clock size={16} aria-hidden="true" />
                      ) : (
                        <AlertCircle size={16} aria-hidden="true" />
                      )}

                      <span>{error}</span>
                    </p>
                  )}
                </form>
              </div>
            )}

            {protectionEnabled && unlocked && (
              <p
                className="document-unlocked-banner"
                role="status"
              >
                <CheckCircle2
                  size={18}
                  aria-hidden="true"
                />

                <span>
                  {success ||
                    "Documents unlocked for 15 minutes."}{" "}
                  Open any file below.
                </span>
              </p>
            )}

            {groups.map((group) => (
              <div className="document-group" key={group.key}>
                {group.title && (
                  <h3 className="document-group-title">
                    {group.title}
                    <span className="document-group-count">
                      {group.items.length}
                    </span>
                  </h3>
                )}

                <ul className="documents-grid">
                  {group.items.map(renderCard)}
                </ul>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}
