import { useEffect, useRef } from "react";

const LINES = [
  "Employers see your video, resume and certificates",
  "before they ever pick up the phone.",
];

// Words numbered across both lines, in reading order.
let wordCount = 0;
const WORDS_BY_LINE = LINES.map((line) =>
  line.split(" ").map((text) => ({ text, index: wordCount++ }))
);

// Gap between words that cross the trigger line in the same frame, so a
// whole line still lights up one word at a time, in reading order.
const STEP_MS = 70;

/**
 * Large type moment further down the home page. Words start muted and each
 * one turns full navy as it crosses a line 40% up from the bottom of the
 * viewport. Without JS, or with reduced motion, the text is simply full
 * colour (the muted state only applies once the section is "armed").
 */
export default function TaglineReveal() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const section = sectionRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!section || reduce || !("IntersectionObserver" in window)) return undefined;

    const words = [...section.querySelectorAll(".tagline-word")];
    const queue = [];
    let timer = null;

    const drain = () => {
      const next = queue.shift();
      if (next === undefined) {
        timer = null;
        return;
      }
      words[next].classList.add("is-lit");
      timer = window.setTimeout(drain, STEP_MS);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => Number(entry.target.dataset.index))
          .sort((a, b) => a - b)
          .forEach((index) => {
            observer.unobserve(words[index]);
            queue.push(index);
          });
        queue.sort((a, b) => a - b);
        if (timer === null && queue.length) drain();
      },
      { rootMargin: "0px 0px -40% 0px" }
    );

    section.classList.add("is-armed");
    words.forEach((word) => observer.observe(word));

    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
      section.classList.remove("is-armed");
      words.forEach((word) => word.classList.remove("is-lit"));
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="home-section tagline-reveal"
      aria-labelledby="tagline-title"
    >
      <div className="container">
        <p className="tagline-kicker">Why it works</p>

        <h2 id="tagline-title" className="tagline-text">
          {WORDS_BY_LINE.map((words, lineIndex) => (
            <span key={lineIndex} className="tagline-line">
              {words.map((word, wordIndex) => (
                <span key={word.index}>
                  <span className="tagline-word" data-index={word.index}>
                    {word.text}
                  </span>
                  {wordIndex < words.length - 1 ? " " : null}
                </span>
              ))}
              {lineIndex < WORDS_BY_LINE.length - 1 ? " " : null}
            </span>
          ))}
        </h2>
      </div>
    </section>
  );
}
