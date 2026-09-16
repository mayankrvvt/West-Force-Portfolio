import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { howItWorks } from "../../constants/siteData";

gsap.registerPlugin(ScrollTrigger);

export default function HowItWorks() {
  const sectionRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;

    if (!section) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      const steps = gsap.utils.toArray(".how-it-works-step");
      const line = section.querySelector(".steps-progress-fill");

      gsap.fromTo(
        steps,
        {
          opacity: 0,
          y: 50,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.18,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 75%",
            once: true,
          },
        }
      );

      if (line) {
        gsap.fromTo(
          line,
          {
            scaleX: 0,
          },
          {
            scaleX: 1,
            transformOrigin: "left center",
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top 65%",
              end: "bottom 65%",
              scrub: 1,
            },
          }
        );
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="how-it-works-section"
    >
      <div className="container">

        <div className="how-it-works-heading">
          <p className="eyebrow">
            HOW IT WORKS
          </p>

          <h2>
            From documents to professional portfolio.
          </h2>

          <p>
            Everything is designed to make sharing your
            professional story simple, secure and effective.
          </p>
        </div>

        <div className="how-it-works-wrapper">

          <div
            className="steps-progress"
            aria-hidden="true"
          >
            <div className="steps-progress-fill" />
          </div>

          <div className="how-it-works-grid">
            {howItWorks.map((step) => (
              <article
                className="how-it-works-step"
                key={step.number}
              >
                <div className="step-number">
                  {step.number}
                </div>

                <span className="step-label">
                  STEP {step.number}
                </span>

                <h3>
                  {step.title}
                </h3>

                <p>
                  {step.description}
                </p>
              </article>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}