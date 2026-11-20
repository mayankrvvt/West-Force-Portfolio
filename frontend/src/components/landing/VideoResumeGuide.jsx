import { useEffect, useRef, useState } from "react";
import "./VideoResumeGuide.css";

/*
 * WestForce: "How to Make Your Video Resume" guide page.
 * Plain React, no extra dependencies. All styles are scoped under .vrg
 * in VideoResumeGuide.css, so nothing leaks into the rest of the site.
 *
 * Render it between your existing Navbar and Footer, the same way your
 * How it works page does (see README.md).
 */

const SCRIPT_TEXT =
  "Hi, I’m [name], and I’m looking for a role as a [job title]. I have experience in [relevant work or training], with strengths in [one or two skills]. In my [previous role, training, or project], I [specific achievement or example]. I’d bring [relevant strength] to your team, and I’m excited to contribute in a [type of role] position. Thank you for watching.";

const STEPS = [
  { id: "vrg-step-1", number: 1, title: "Plan what you’ll say" },
  { id: "vrg-step-2", number: 2, title: "Set up your recording" },
  { id: "vrg-step-3", number: 3, title: "Speak naturally" },
  { id: "vrg-step-4", number: 4, title: "Review before adding it" },
];

// Renders the script with each [placeholder] highlighted.
function ScriptWithPlaceholders({ text }) {
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, i) =>
    part.startsWith("[") ? (
      <mark key={i} className="vrg-placeholder">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback for older browsers or non-HTTPS previews.
  return new Promise((resolve, reject) => {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    ok ? resolve() : reject(new Error("Copy failed"));
  });
}

function StepHeader({ step }) {
  return (
    <header className="vrg-step-header">
      <span className="vrg-step-number" aria-hidden="true">
        {step.number}
      </span>
      <h2 id={`${step.id}-title`}>
        <span className="vrg-visually-hidden">Step {step.number}: </span>
        {step.title}
      </h2>
    </header>
  );
}

export default function VideoResumeGuide() {
  const [copyStatus, setCopyStatus] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    document.title = "How to make your video resume | WestForce Portfolio";
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleCopy = async () => {
    clearTimeout(timerRef.current);
    try {
      await copyText(SCRIPT_TEXT);
      setCopyStatus("Script copied");
    } catch {
      setCopyStatus("Couldn’t copy. Select the text and copy it instead.");
    }
    timerRef.current = setTimeout(() => setCopyStatus(""), 3000);
  };

  // Smooth-scrolls to a step without touching the router's URL handling.
  const jumpTo = (event, id) => {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    target.focus({ preventScroll: true });
  };

  return (
    <article className="vrg" aria-labelledby="vrg-title">
      {/* Hero */}
      <section className="vrg-hero">
        <div className="vrg-container vrg-narrow vrg-hero-inner">
          <h1 id="vrg-title">How to make your video resume</h1>
          <p className="vrg-hero-subtitle">
            Show employers the person behind your resume.
          </p>

          <nav className="vrg-jump" aria-label="Guide steps">
            <ol>
              {STEPS.map((step) => (
                <li key={step.id}>
                  <a href={`#${step.id}`} onClick={(e) => jumpTo(e, step.id)}>
                    <span aria-hidden="true">{step.number}</span>
                    {step.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </section>

      {/* Intro */}
      <section className="vrg-intro" aria-label="Introduction">
        <div className="vrg-container vrg-narrow">
          <p className="vrg-lead">
            A video resume is a short introduction to your skills, experience,
            and the kind of work you’re looking for. It complements your written
            resume—it doesn’t need to repeat every detail.{" "}
            <strong className="vrg-length">Aim for 60–90 seconds.</strong>
          </p>
        </div>
      </section>

      {/* Video example */}
      <section className="vrg-demo" aria-labelledby="vrg-demo-title">
        <div className="vrg-container vrg-narrow">
          <div className="vrg-demo-copy">
            <h2 id="vrg-demo-title">What a video resume can look like</h2>
            <p>
              Watch this short example for an idea of how to introduce your
              experience and speak naturally on camera.
            </p>
          </div>
          <video
            className="vrg-demo-video"
            controls
            playsInline
            preload="none"
            poster="/demo-poster.jpg"
            aria-label="Example video resume"
          >
            <source src="/demo.mp4" type="video/mp4" />
            Your browser doesn’t support embedded video. You can still follow
            the written guide below.
          </video>
        </div>
      </section>

      {/* Steps */}
      <div className="vrg-container vrg-narrow vrg-steps">
        {/* Step 1 */}
        <section
          id={STEPS[0].id}
          className="vrg-step"
          aria-labelledby={`${STEPS[0].id}-title`}
          tabIndex={-1}
        >
          <StepHeader step={STEPS[0]} />
          <p>Use this simple structure:</p>
          <ul className="vrg-list">
            <li>
              <strong>Introduce yourself:</strong> Your name, your field, and
              the role you’re looking for.
            </li>
            <li>
              <strong>Highlight your experience:</strong> Mention relevant work,
              training, or a project.
            </li>
            <li>
              <strong>Give one example:</strong> Describe something you did well
              and the result. Use numbers if you have them—never invent them.
            </li>
            <li>
              <strong>Close with your goal:</strong> Explain what you would
              bring to your next team and thank the viewer.
            </li>
          </ul>

          <figure className="vrg-script">
            <div className="vrg-script-top">
              <figcaption>
                <h3>Your starting script</h3>
              </figcaption>
              <button
                type="button"
                className="vrg-copy-button"
                onClick={handleCopy}
              >
                Copy script
              </button>
            </div>
            <blockquote>
              <p>
                “<ScriptWithPlaceholders text={SCRIPT_TEXT} />”
              </p>
            </blockquote>
            <p className="vrg-copy-status" role="status" aria-live="polite">
              {copyStatus}
            </p>
          </figure>

          <p className="vrg-tip">
            Make it sound like you. If you’re new to the workforce, talk about a
            course, volunteer experience, or project instead of a previous job.
          </p>
        </section>

        {/* Step 2 */}
        <section
          id={STEPS[1].id}
          className="vrg-step"
          aria-labelledby={`${STEPS[1].id}-title`}
          tabIndex={-1}
        >
          <StepHeader step={STEPS[1]} />
          <p>
            Your phone is enough. Place it on a steady surface at eye level,
            face a window or soft light, and choose a quiet space with a simple
            background. Wear something appropriate for the job. Record a short
            test to check that your face is clear and your voice is easy to
            hear.
          </p>
        </section>

        {/* Step 3 */}
        <section
          id={STEPS[2].id}
          className="vrg-step"
          aria-labelledby={`${STEPS[2].id}-title`}
          tabIndex={-1}
        >
          <StepHeader step={STEPS[2]} />
          <p>
            Look into the camera, speak clearly, and use short sentences. Keep a
            few notes nearby rather than reading every word. Practise once or
            twice, then record a few takes. You don’t need a perfect accent or a
            polished performance—focus on being clear and genuine.
          </p>
        </section>

        {/* Step 4 */}
        <section
          id={STEPS[3].id}
          className="vrg-step"
          aria-labelledby={`${STEPS[3].id}-title`}
          tabIndex={-1}
        >
          <StepHeader step={STEPS[3]} />
          <p>
            Watch the full video. Check the sound, remove long pauses at the
            beginning and end, and make sure your examples match your written
            resume. Add accurate captions if possible. Skip background music,
            filters, and distracting effects.
          </p>
        </section>

        {/* Privacy */}
        <aside className="vrg-privacy" aria-labelledby="vrg-privacy-title">
          <svg
            className="vrg-privacy-icon"
            viewBox="0 0 24 24"
            width="28"
            height="28"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M12 2.5 4.5 5.5v6c0 4.6 3.1 8.7 7.5 10 4.4-1.3 7.5-5.4 7.5-10v-6L12 2.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M12 8v4.5M12 15.5h.01"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <div>
            <h2 id="vrg-privacy-title">Keep personal details private</h2>
            <p>
              Don’t show identity documents or share your home address,
              identification numbers, or other sensitive information. Focus on
              your professional skills and experience.
            </p>
          </div>
        </aside>
      </div>

      {/* Closing */}
      <section className="vrg-closing" aria-label="Closing thought">
        <div className="vrg-container">
          <p>Clear, honest, and relevant beats perfectly produced.</p>
        </div>
      </section>
    </article>
  );
}
