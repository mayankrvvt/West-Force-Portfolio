import { useEffect, useId, useRef, useState } from "react";
import { Lock, LockOpen } from "lucide-react";

import MapleLeaf from "../brand/MapleLeaf";
import useRevealOnce from "./useRevealOnce";

// Demo only: nothing here talks to the API.
const DEMO_PIN = "1234";

const documents = [
  { name: "Resume", detail: "PDF, 2 pages, updated October 2026" },
  { name: "Vulnerable sector check", detail: "Police check, issued August 2026" },
  { name: "References", detail: "2 former supervisors, with phone numbers" },
];

const AUTOPLAY_START_MS = 500;
const AUTOPLAY_DIGIT_MS = 160;

const reduceMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/*
 * "What an employer sees": a sample portfolio whose documents open with a
 * PIN. Wrong PIN: the field shakes once and the error is announced. Right
 * PIN: the locks open and the rows reveal in a short stagger (CSS, inside
 * prefers-reduced-motion: no-preference, so reduced motion is instant).
 *
 * The first time the card scrolls into view it plays the unlock once on its
 * own: the demo PIN types in, then the rows open. It never moves focus, it
 * stops the moment the visitor touches the field, and it is skipped with
 * reduced motion. Manual entry works the same as before.
 */
export default function EmployerShowcase() {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const fieldRef = useRef(null);
  const inputRef = useRef(null);
  const lockAgainRef = useRef(null);
  const movedFocus = useRef(false);
  const cardRef = useRef(null);
  const touched = useRef(false);
  const timers = useRef([]);

  const id = useId();
  const inputId = `${id}-pin`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  // Keep focus on the control that replaces the one the user just used.
  useEffect(() => {
    if (!movedFocus.current) return;
    movedFocus.current = false;
    (unlocked ? lockAgainRef : inputRef).current?.focus();
  }, [unlocked]);

  const shake = () => {
    if (reduceMotion() || !fieldRef.current?.animate) return;
    fieldRef.current.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(5px)" },
        { transform: "translateX(-3px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 320, easing: "cubic-bezier(0.36, 0, 0.3, 1)" }
    );
  };

  const stopAutoplay = () => {
    touched.current = true;
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.length = 0;
  };

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const unlock = ({ moveFocus }) => {
    movedFocus.current = moveFocus;
    setError("");
    setStatus("Documents unlocked. Emma’s resume, police check and references are now visible.");
    setUnlocked(true);
  };

  useRevealOnce(cardRef, {
    onReveal: ({ reduce }) => {
      if (reduce || touched.current) return;
      const later = (fn, ms) => timers.current.push(window.setTimeout(fn, ms));
      [...DEMO_PIN].forEach((_, index) => {
        later(() => setPin(DEMO_PIN.slice(0, index + 1)), AUTOPLAY_START_MS + index * AUTOPLAY_DIGIT_MS);
      });
      later(
        () => unlock({ moveFocus: false }),
        AUTOPLAY_START_MS + (DEMO_PIN.length + 2) * AUTOPLAY_DIGIT_MS
      );
    },
  });

  const check = (value) => {
    if (value === DEMO_PIN) {
      unlock({ moveFocus: true });
      return;
    }

    setError(
      value.length < 4
        ? "Enter all 4 digits of the PIN."
        : "That PIN doesn’t match. Try 1234."
    );
    setStatus("");
    shake();
    inputRef.current?.select();
  };

  const handleChange = (event) => {
    stopAutoplay();
    const value = event.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(value);
    if (error) setError("");
    if (value.length === 4) check(value);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    stopAutoplay();
    check(pin);
  };

  const lockAgain = () => {
    stopAutoplay();
    movedFocus.current = true;
    setPin("");
    setError("");
    setStatus("Documents locked again.");
    setUnlocked(false);
  };

  return (
    <section
      id="employer-view"
      className="home-section home-section-frost"
      aria-labelledby="employer-view-title"
    >
      <div className="container home-split pin-showcase">
        <div className="home-section-head">
          <p className="home-kicker">Try it</p>

          <h2 id="employer-view-title">What an employer sees</h2>

          <p>
            Anyone with your link sees your name, role and summary.
            Your documents stay locked until someone enters the PIN
            you gave them.
          </p>

          <p className="pin-showcase-try">
            Try it on the sample portfolio: this is the view an
            employer gets when they open your link.
          </p>
        </div>

        <article
          ref={cardRef}
          className={`pin-demo${unlocked ? " is-unlocked" : ""}`}
          aria-labelledby={`${id}-name`}
        >
          <header className="pin-demo-head">
            <span className="pin-demo-avatar" aria-hidden="true">ET</span>

            <div className="pin-demo-person">
              <h3 id={`${id}-name`}>Emma Tremblay</h3>
              <p>Personal support worker, Brampton, ON</p>
            </div>

            <span className="wf-seal pin-demo-seal">
              <MapleLeaf width="14" height="14" />
              {unlocked ? "Unlocked" : "Locked"}
            </span>
          </header>

          <ul className="pin-demo-docs" aria-label="Documents">
            {documents.map((doc, index) => (
              <li key={doc.name} style={{ "--row": index }}>
                <span className="pin-demo-lock" aria-hidden="true">
                  <Lock className="pin-demo-lock-shut" size={18} strokeWidth={2} />
                  <LockOpen className="pin-demo-lock-open" size={18} strokeWidth={2} />
                </span>

                <span className="pin-demo-doc">
                  <span className="pin-demo-doc-name">{doc.name}</span>

                  {unlocked ? (
                    <span className="pin-demo-doc-detail">{doc.detail}</span>
                  ) : (
                    <span className="pin-demo-doc-locked">
                      <span className="pin-demo-redact" aria-hidden="true" />
                      <span className="sr-only">Locked</span>
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className="pin-demo-foot">
            {unlocked ? (
              <button
                ref={lockAgainRef}
                type="button"
                className="btn btn-secondary"
                onClick={lockAgain}
              >
                Lock again
              </button>
            ) : (
              <form className="pin-demo-form" onSubmit={handleSubmit} noValidate>
                <label htmlFor={inputId}>Enter the PIN to open documents</label>

                <div className="pin-demo-row">
                  <div ref={fieldRef} className="pin-demo-field">
                    <input
                      ref={inputRef}
                      id={inputId}
                      className="input pin-demo-input"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      value={pin}
                      onChange={handleChange}
                      onFocus={stopAutoplay}
                      aria-invalid={error ? "true" : undefined}
                      aria-describedby={`${hintId}${error ? ` ${errorId}` : ""}`}
                    />
                  </div>

                  <button type="submit" className="btn btn-primary">
                    Unlock
                  </button>
                </div>

                <p id={hintId} className="pin-demo-hint">Try 1234</p>
              </form>
            )}

            <p
              id={errorId}
              className={error ? "pin-demo-error" : "sr-only"}
              role="status"
              aria-live="polite"
            >
              {error || status}
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}
