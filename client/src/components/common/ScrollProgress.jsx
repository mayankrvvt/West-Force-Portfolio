import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function ScrollProgress() {
  const progressRef = useRef(null);

  useLayoutEffect(() => {
    const progress = progressRef.current;

    if (!progress) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) {
      progress.style.width = "100%";
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        progress,
        {
          scaleX: 0,
        },
        {
          scaleX: 1,
          transformOrigin: "left center",
          ease: "none",
          scrollTrigger: {
            start: "top top",
            end: "bottom bottom",
            scrub: true,
          },
        }
      );
    });

    return () => ctx.revert();
  }, []);

  return (
    <div className="scroll-progress" aria-hidden="true">
      <div ref={progressRef} className="scroll-progress-bar" />
    </div>
  );
}