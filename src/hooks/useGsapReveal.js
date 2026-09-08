import { useLayoutEffect } from "react";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function useGsapReveal(scopeRef) {
  useLayoutEffect(() => {
    if (!scopeRef?.current) {
      return;
    }

    const ctx = gsap.context(() => {
      const elements = gsap.utils.toArray("[data-reveal]");

      if (!elements.length) {
        return;
      }

      elements.forEach((element) => {
        gsap.fromTo(
          element,
          {
            y: 45,
            opacity: 0,
          },
          {
            y: 0,
            opacity: 1,
            duration: 0.9,
            ease: "power3.out",

            scrollTrigger: {
              trigger: element,
              start: "top 85%",
              once: true,
            },
          }
        );
      });
    }, scopeRef);

    return () => {
      ctx.revert();
    };
  }, [scopeRef]);
}