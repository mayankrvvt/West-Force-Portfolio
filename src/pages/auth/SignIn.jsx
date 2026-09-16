import { useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import gsap from "gsap";

import Input from "../../components/common/Input";

import {
  loginWithDemoCredentials,
  createDemoSession,
} from "../../services/demoAuth";

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();

  const pageRef = useRef(null);
  const cardRef = useRef(null);
  const glowRef = useRef(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* -----------------------------------------
     Entrance animations
  ----------------------------------------- */

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
      if (reduceMotion) {
        return;
      }

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
          delay: 0.15,
          ease: "power2.out",
        }
      );

      gsap.to(".signin-orb-one", {
        x: 70,
        y: -45,
        duration: 7,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".signin-orb-two", {
        x: -55,
        y: 50,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".signin-orb-three", {
        x: 35,
        y: 35,
        duration: 6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, page);

    return () => {
      ctx.revert();
    };
  }, []);

  /* -----------------------------------------
     Background mouse interaction
  ----------------------------------------- */

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

  /* -----------------------------------------
     Card tilt
  ----------------------------------------- */

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

  /* -----------------------------------------
     Form handling
  ----------------------------------------- */

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

  /* -----------------------------------------
     Sign in
  ----------------------------------------- */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const email = formData.email.trim();
    const password = formData.password;

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const isValid = loginWithDemoCredentials(
        email,
        password
      );

      if (!isValid) {
        setError("Invalid email or password.");
        return;
      }

      createDemoSession();

      const destination =
        location.state?.from?.pathname ||
        "/onboarding/create-portfolio";

      navigate(destination, {
        replace: true,
      });
    } catch (loginError) {
      console.error("Sign in error:", loginError);

      setError(
        "Something went wrong while signing in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      ref={pageRef}
      className="signin-page"
      onPointerMove={handlePointerMove}
    >
      {/* Animated background */}

      <div
        className="signin-background"
        aria-hidden="true"
      >
        <div
          ref={glowRef}
          className="signin-mouse-glow"
        />

        <div className="signin-orb signin-orb-one" />
        <div className="signin-orb signin-orb-two" />
        <div className="signin-orb signin-orb-three" />

        <div className="signin-grid-pattern" />
      </div>

      {/* Sign in card */}

      <div
        ref={cardRef}
        className="signin-card"
        onPointerMove={handleCardPointerMove}
        onPointerLeave={handleCardPointerLeave}
      >
        {/* Logo */}

        <Link
          to="/"
          className="signin-logo"
          aria-label="WestForce home"
        >
          <img
            src="/favicon.png"
            alt="WestForce"
          />
        </Link>

        {/* Heading */}

        <div className="signin-heading">
          <p className="signin-eyebrow">
            WESTFORCE PORTFOLIO
          </p>

          <h1>Welcome back</h1>

          <p>
            Sign in to access your professional
            portfolio.
          </p>
        </div>

        {/* Error */}

        {error && (
          <div
            className="signin-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Form */}

        <form
          className="signin-form"
          onSubmit={handleSubmit}
        >
          {/* Email */}

          <div className="signin-field">
            <label htmlFor="email">
              Email
            </label>

            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          {/* Password */}

          <div className="signin-field">
            <label htmlFor="password">
              Password
            </label>

            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {/* Forgot password */}

          <div className="signin-forgot-wrapper">
            <Link
              to="/auth/forgot-password"
              className="signin-forgot"
            >
              Forgot your password?
            </Link>
          </div>

          {/* Submit */}

          <button
            type="submit"
            className="signin-button"
            disabled={loading}
          >
            <span>
              {loading
                ? "Signing in..."
                : "Sign in"}
            </span>

            {!loading && (
              <span className="signin-button-arrow">
                →
              </span>
            )}
          </button>
        </form>

        {/* Create account */}

        <div className="signin-divider" />

        <p className="signin-signup">
          Don't have an account?{" "}
          <Link to="/auth/sign-up">
            Create an account
          </Link>
        </p>

        {/* Demo credentials */}

        <div className="signin-demo">
          <p>Demo account</p>

          <span>
            demo@westforce.com
          </span>

          <span>
            WestForce123
          </span>
        </div>
      </div>
    </main>
  );
}