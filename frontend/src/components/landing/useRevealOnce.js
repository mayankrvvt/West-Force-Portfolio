import { useEffect, useRef } from "react";

/**
 * Reveal a block once, the first time it scrolls into view.
 *
 * Only when motion is allowed and IntersectionObserver exists, the element
 * gets "is-armed" (CSS hides it in its start state) and then "is-in" when it
 * enters the viewport. Without JS, or with reduced motion, neither class is
 * added, so the CSS final state shows at once.
 *
 * onReveal runs once when the element first enters view, also with reduced
 * motion (the caller decides what to do then).
 */
export default function useRevealOnce(ref, { onReveal, rootMargin = "0px 0px -12% 0px" } = {}) {
  const onRevealRef = useRef(onReveal);

  useEffect(() => {
    onRevealRef.current = onReveal;
  });

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) node.classList.add("is-armed");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        node.classList.add("is-in");
        onRevealRef.current?.({ reduce });
      },
      { rootMargin, threshold: 0.15 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
      node.classList.remove("is-armed", "is-in");
    };
  }, [ref, rootMargin]);
}
