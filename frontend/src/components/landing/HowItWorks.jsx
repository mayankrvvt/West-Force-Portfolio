import { howItWorks } from "../../constants/siteData";

/**
 * The three steps from sign-up to sharing. Use headingLevel={1} when this
 * section is the whole page (the /how-it-works route).
 */
export default function HowItWorks({ headingLevel = 2 }) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const StepHeading = headingLevel === 1 ? "h2" : "h3";

  return (
    <section
      id="how-it-works"
      className="home-section"
      aria-labelledby="how-it-works-title"
    >
      <div className="container">
        <div className="home-section-head">
          <Heading id="how-it-works-title">
            From documents to a portfolio employers can open
          </Heading>

          <p>
            Three steps to share your professional story
            simply and securely.
          </p>
        </div>

        <ol className="step-list">
          {howItWorks.map((step) => (
            <li key={step.number}>
              <span className="step-list-number" aria-hidden="true">
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
