import { useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import gsap from "gsap";

export default function CreatePortfolio() {
  const navigate = useNavigate();

  const pageRef = useRef(null);
  const cardRef = useRef(null);
  const glowRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: "",
    headline: "",
    summary: "",
    passcode: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /*
   * -----------------------------------------
   * Page entrance + interactive background
   * -----------------------------------------
   */
  useLayoutEffect(() => {
    const page = pageRef.current;
    const card = cardRef.current;
    const glow = glowRef.current;

    if (!page || !card || !glow) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const ctx = gsap.context(() => {
      if (!reduceMotion) {
        // Card entrance
        gsap.fromTo(
          card,
          {
            opacity: 0,
            y: 45,
            scale: 0.97,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 1,
            ease: "power3.out",
          }
        );

        // Ambient glow entrance
        gsap.fromTo(
          glow,
          {
            opacity: 0,
            scale: 0.7,
          },
          {
            opacity: 1,
            scale: 1,
            duration: 1.4,
            delay: 0.2,
            ease: "power2.out",
          }
        );

        // Floating background animation
        gsap.to(".portfolio-orb-one", {
          x: 70,
          y: -45,
          duration: 7,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });

        gsap.to(".portfolio-orb-two", {
          x: -55,
          y: 50,
          duration: 9,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });

        gsap.to(".portfolio-orb-three", {
          x: 35,
          y: 35,
          duration: 6,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    }, page);

    return () => {
      ctx.revert();
    };
  }, []);

  /*
   * -----------------------------------------
   * Mouse-following background glow
   * -----------------------------------------
   */
  const handlePointerMove = (event) => {
    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      return;
    }

    const page = pageRef.current;
    const glow = glowRef.current;

    if (!page || !glow) {
      return;
    }

    const rect = page.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    gsap.to(glow, {
      x: x - 250,
      y: y - 250,
      duration: 1.2,
      ease: "power3.out",
      overwrite: true,
    });
  };

  /*
   * -----------------------------------------
   * Card subtle tilt
   * -----------------------------------------
   */
  const handleCardPointerMove = (event) => {
    if (
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
    ) {
      return;
    }

    const card = cardRef.current;

    if (!card) {
      return;
    }

    const rect = card.getBoundingClientRect();

    const x =
      (event.clientX - rect.left) / rect.width - 0.5;

    const y =
      (event.clientY - rect.top) / rect.height - 0.5;

    gsap.to(card, {
      rotateY: x * 3,
      rotateX: y * -3,
      transformPerspective: 1200,
      duration: 0.45,
      ease: "power3.out",
      overwrite: true,
    });
  };

  const handleCardPointerLeave = () => {
    const card = cardRef.current;

    if (!card) {
      return;
    }

    gsap.to(card, {
      rotateY: 0,
      rotateX: 0,
      duration: 0.7,
      ease: "power3.out",
    });
  };

  /*
   * -----------------------------------------
   * Form
   * -----------------------------------------
   */
  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    setError("");

    const fullName = formData.fullName.trim();
    const headline = formData.headline.trim();
    const summary = formData.summary.trim();
    const passcode = formData.passcode.trim();

    if (!fullName) {
      setError("Please enter your full name.");
      return;
    }

    if (!headline) {
      setError("Please enter your professional headline.");
      return;
    }

    if (!summary) {
      setError("Please enter a short professional summary.");
      return;
    }

    if (!passcode) {
      setError("Please create an employer passcode.");
      return;
    }

    if (passcode.length < 4) {
      setError(
        "Employer passcode must be at least 4 characters."
      );
      return;
    }

    setLoading(true);

    localStorage.setItem(
      "westforce_portfolio",
      JSON.stringify({
        ...formData,
        fullName,
        headline,
        summary,
        passcode,
      })
    );

    gsap.to(cardRef.current, {
      scale: 0.98,
      opacity: 0.92,
      duration: 0.2,
      ease: "power2.out",
      onComplete: () => {
        navigate("/dashboard", {
          replace: true,
        });
      },
    });
  };

  return (
    <main
      ref={pageRef}
      className="create-portfolio-page"
      onPointerMove={handlePointerMove}
    >
      {/* Ambient background */}
      <div
        className="portfolio-background"
        aria-hidden="true"
      >
        <div
          ref={glowRef}
          className="portfolio-mouse-glow"
        />

        <div className="portfolio-orb portfolio-orb-one" />
        <div className="portfolio-orb portfolio-orb-two" />
        <div className="portfolio-orb portfolio-orb-three" />

        <div className="portfolio-grid-pattern" />
      </div>

      {/* Main card */}
      <div
        ref={cardRef}
        className="create-portfolio-card"
        onPointerMove={handleCardPointerMove}
        onPointerLeave={handleCardPointerLeave}
      >
        {/* Logo */}
        <Link
          to="/"
          className="create-portfolio-logo"
          aria-label="WestForce home"
        >
          <img
            src="/favicon.png"
            alt="WestForce"
          />
        </Link>

        {/* Heading */}
        <div className="create-portfolio-heading">
          <p className="create-portfolio-eyebrow">
            WESTFORCE PORTFOLIO
          </p>

          <h1>Create your portfolio</h1>

          <p>
            Build your professional profile and create a
            shareable portfolio for employers.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="create-portfolio-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form
          className="create-portfolio-form"
          onSubmit={handleSubmit}
        >
          {/* Full name */}
          <div className="create-field">
            <label htmlFor="fullName">
              Full name
            </label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              disabled={loading}
            />
          </div>

          {/* Headline */}
          <div className="create-field">
            <label htmlFor="headline">
              Professional headline
            </label>

            <input
              id="headline"
              name="headline"
              type="text"
              value={formData.headline}
              onChange={handleChange}
              placeholder="e.g. Software Developer"
              disabled={loading}
            />
          </div>

          {/* Summary */}
          <div className="create-field">
            <label htmlFor="summary">
              Professional summary
            </label>

            <textarea
              id="summary"
              name="summary"
              value={formData.summary}
              onChange={handleChange}
              placeholder="Write a short introduction about yourself..."
              rows={5}
              disabled={loading}
            />
          </div>

          {/* Passcode */}
          <div className="create-field">
            <label htmlFor="passcode">
              Employer passcode
            </label>

            <input
              id="passcode"
              name="passcode"
              type="password"
              value={formData.passcode}
              onChange={handleChange}
              placeholder="Create a passcode"
              autoComplete="new-password"
              disabled={loading}
            />

            <span className="create-field-help">
              This passcode can be shared with employers
              to access your portfolio.
            </span>
          </div>

          {/* Button */}
          <button
            type="submit"
            className="create-portfolio-button"
            disabled={loading}
          >
            <span>
              {loading
                ? "Creating portfolio..."
                : "Create portfolio"}
            </span>

            {!loading && (
              <span className="button-arrow">
                →
              </span>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}