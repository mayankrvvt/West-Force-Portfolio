import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

const employerTypes = [
  "Construction",
  "Healthcare",
  "Logistics",
  "Hospitality",
  "Skilled Trades",
  "Manufacturing",
  "Transportation",
  "Professional Services",
];

export default function EmployerShowcase() {
  const sectionRef = useRef(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".employer-showcase-content",
        {
          opacity: 0,
          y: 45,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
        }
      );

      gsap.to(".employer-marquee-track", {
        xPercent: -50,
        duration: 24,
        ease: "none",
        repeat: -1,
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="employer-showcase-section"
    >
      <div className="container">

        <div className="employer-showcase-content">
          <p className="eyebrow">
            SEE WESTFORCE IN ACTION
          </p>

          <h2>
            Real candidates. Real Canadian employers.
          </h2>

          <p>
            Give employers a clear, professional view of your
            skills, experience and credentials from one
            shareable profile.
          </p>
        </div>

        <div className="employer-marquee">
          <div className="employer-marquee-track">
            {[...employerTypes, ...employerTypes].map(
              (employer, index) => (
                <div
                  className="employer-marquee-item"
                  key={`${employer}-${index}`}
                >
                  <span className="employer-marquee-dot" />
                  {employer}
                </div>
              )
            )}
          </div>
        </div>

      </div>
    </section>
  );
}