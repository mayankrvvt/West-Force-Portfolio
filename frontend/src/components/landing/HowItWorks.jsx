import { useEffect, useRef } from "react";

import { howItWorks } from "../../constants/siteData";

// Scroll range, as viewport fractions: starts when the list top reaches 78%
// of the viewport and ends when its bottom reaches 60%.
const START_AT = 0.78;
const END_AT = 0.6;
// Catch-up time constant in seconds; about the old GSAP "scrub: 0.4" lag.
const SMOOTHING = 0.13;

/**
 * The three steps from sign-up to sharing. Use headingLevel={1} when this
 * section is the whole page (the /how-it-works route).
 *
 * Each step (but the last) owns a connector that runs from its marker to the
 * next one: across on desktop, down on phones. The geometry is pure CSS, so
 * it is exact in both layouts. As you scroll, the connectors fill in order
 * and each marker fills when the line reaches it. Without JS or with reduced
 * motion every connector is full and every marker is filled (CSS defaults).
 * Each step's text sits faded until its marker is reached.
 * tone="frost" gives the section the frost band (home page rhythm).
 */
export default function HowItWorks({ headingLevel = 2, tone = "white" }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const StepHeading = headingLevel === 1 ? "h2" : "h3";
  const listRef = useRef(null);

  useEffect(() => {
    const list = listRef.current;

    if (!list) return undefined;

    const media = window.matchMedia(
      "(prefers-reduced-motion: no-preference)"
    );

    const setup = () => {
      const steps = [...list.querySelectorAll(":scope > li")];
      const segments = steps.length - 1;
      const state = { progress: 0 };

      // progress 0..1 over the whole list; connector i fills over its slice.
      const paint = () => {
        const along = state.progress * segments;
        steps.forEach((step, i) => {
          const fill = Math.min(Math.max(along - i, 0), 1);
          step.style.setProperty("--fill", fill.toFixed(3));
          step.classList.toggle(
            "is-reached",
            i === 0 ? state.progress > 0.001 : along >= i - 0.001
          );
        });
      };

      const targetProgress = () => {
        const viewport = window.innerHeight;
        const rect = list.getBoundingClientRect();
        const distance = rect.height + (START_AT - END_AT) * viewport;
        if (distance <= 0) return 1;
        const raw = (START_AT * viewport - rect.top) / distance;
        return Math.min(Math.max(raw, 0), 1);
      };

      let frame = 0;
      let lastTime = 0;

      // Ease state.progress toward the scroll position, then stop.
      const tick = (time) => {
        const target = targetProgress();
        const elapsed = lastTime ? (time - lastTime) / 1000 : 1 / 60;
        lastTime = time;

        const step = 1 - Math.exp(-elapsed / SMOOTHING);
        state.progress += (target - state.progress) * step;

        if (Math.abs(target - state.progress) < 0.001) {
          state.progress = target;
        }

        paint();

        if (state.progress !== target) {
          frame = requestAnimationFrame(tick);
        } else {
          frame = 0;
          lastTime = 0;
        }
      };

      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(tick);
      };

      list.classList.add("is-live");
      // Start at the current scroll position, without easing in from zero.
      state.progress = targetProgress();
      paint();

      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);

      return () => {
        if (frame) cancelAnimationFrame(frame);
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
        list.classList.remove("is-live");
        steps.forEach((step) => {
          step.classList.remove("is-reached");
          step.style.removeProperty("--fill");
        });
      };
    };

    let teardown = media.matches ? setup() : null;

    const handleChange = () => {
      teardown?.();
      teardown = media.matches ? setup() : null;
    };

    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener("change", handleChange);
      teardown?.();
    };
  }, []);

  return (
    <section
      id="how-it-works"
      className={`home-section${tone === "frost" ? " home-section-frost" : ""}`}
      aria-labelledby="how-it-works-title"
    >
      <div className="container">
        <div className="home-section-head">
          <p className="home-kicker">How it works</p>

          <Heading id="how-it-works-title">
            From documents to a portfolio employers can open
          </Heading>

          <p>
            Three steps, from creating your account to sending
            your first link.
          </p>
        </div>

        <ol ref={listRef} className="step-list">
          {howItWorks.map((step) => (
            <li key={step.number}>
              <span className="step-list-link" aria-hidden="true" />
              <span
                className="step-list-number"
                data-step={step.number}
                aria-hidden="true"
              >
                {step.number}
              </span>
              <StepHeading>{step.title}</StepHeading>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
