import { useRef } from "react";
import { Check, Minus } from "lucide-react";

import MapleLeaf from "../brand/MapleLeaf";
import useRevealOnce from "./useRevealOnce";

const before = [
  "You attach your resume to one application, then attach it again for the next.",
  "Your certificates sit in old emails and photo folders.",
  "An employer meets you for the first time at the interview.",
];

const after = [
  "You paste one link into every application, email and text.",
  "Your certificates, references and skills report live on one page you keep current.",
  "An employer has watched your intro video before they call you.",
];

/*
 * The real outcome, as a side by side comparison. The two cards rise in once,
 * 60ms apart (shares the reveal rules with the feature cards in public.css).
 */
export default function Outcome() {
  const gridRef = useRef(null);
  useRevealOnce(gridRef);

  return (
    <section className="home-section" aria-labelledby="outcome-title">
      <div className="container">
        <div className="home-section-head">
          <p className="home-kicker">The difference</p>

          <h2 id="outcome-title">
            Your next application, with and without a portfolio
          </h2>
        </div>

        <div ref={gridRef} className="outcome-grid">
          <article className="outcome-card" style={{ "--i": 0 }} aria-labelledby="outcome-before">
            <h3 id="outcome-before" className="outcome-label">
              Applying the usual way
            </h3>

            <ul className="outcome-list">
              {before.map((item) => (
                <li key={item}>
                  <span className="outcome-mark" aria-hidden="true">
                    <Minus size={14} strokeWidth={2.25} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article
            className="outcome-card outcome-card-after"
            style={{ "--i": 1 }}
            aria-labelledby="outcome-after"
          >
            <MapleLeaf className="outcome-leaf" />

            <h3 id="outcome-after" className="outcome-label">
              Applying with WestForce
            </h3>

            <ul className="outcome-list">
              {after.map((item) => (
                <li key={item}>
                  <span className="outcome-mark" aria-hidden="true">
                    <Check size={14} strokeWidth={2.5} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
