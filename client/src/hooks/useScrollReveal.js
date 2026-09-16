import { useEffect } from "react";

export default function useScrollReveal() {
  useEffect(() => {
    const nodes =
      document.querySelectorAll(
        ".reveal"
      );

    if (
      !(
        "IntersectionObserver" in
        window
      )
    ) {
      nodes.forEach((node) =>
        node.classList.add(
          "visible"
        )
      );

      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach(
            (entry) => {
              if (
                entry.isIntersecting
              ) {
                entry.target.classList.add(
                  "visible"
                );

                observer.unobserve(
                  entry.target
                );
              }
            }
          );
        },
        {
          threshold: 0.12,
        }
      );

    nodes.forEach((node) =>
      observer.observe(node)
    );

    return () =>
      observer.disconnect();
  }, []);
}