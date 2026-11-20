import { useLayoutEffect, useRef } from "react";

// Plain scroll listener instead of GSAP, so every page skips the GSAP chunk.

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

    let frame = 0;

    const paint = () => {
      frame = 0;
      const root = document.documentElement;
      const scrollable = root.scrollHeight - window.innerHeight;
      const ratio =
        scrollable > 0
          ? Math.min(Math.max(window.scrollY / scrollable, 0), 1)
          : 0;
      progress.style.transform = `scaleX(${ratio})`;
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    // Page height changes (new route, content loading) move the end point.
    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(schedule);
    resizeObserver?.observe(document.body);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resizeObserver?.disconnect();
      progress.style.removeProperty("transform");
    };
  }, []);

  return (
    <div className="scroll-progress" aria-hidden="true">
      <div ref={progressRef} className="scroll-progress-bar" />
    </div>
  );
}