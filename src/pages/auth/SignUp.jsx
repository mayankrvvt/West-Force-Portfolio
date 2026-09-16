import { useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";

import Input from "../../components/common/Input";

import {
  signupDemoUser,
  createDemoSession,
} from "../../services/demoAuth";

export default function SignUp() {
  const navigate = useNavigate();

  const pageRef = useRef(null);
  const cardRef = useRef(null);
  const glowRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
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

      gsap.to(".signup-orb-one", {
        x: 70,
        y: -45,
        duration: 7,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".signup-orb-two", {
        x: -55,
        y: 50,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      gsap.to(".signup-orb-three", {
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
     Sign up
  ----------------------------------------- */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const fullName = formData.fullName.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (!fullName) {
      setError("Please enter your full name.");
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const result = signupDemoUser({
        fullName,
        email,
        password,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      createDemoSession();

      console.log("Signup successful:", result);

      navigate("/onboarding/create-portfolio", {
        replace: true,
      });
    } catch (signupError) {
      console.error("Sign up error:", signupError);

      setError(
        "Something went wrong while creating your account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      ref={pageRef}
      className="signin-page signup-page"
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

        <div className="signin-orb signin-orb-one signup-orb-one" />

        <div className="signin-orb signin-orb-two signup-orb-two" />

        <div className="signin-orb signin-orb-three signup-orb-three" />

        <div className="signin-grid-pattern" />
      </div>

      {/* Sign up card */}

      <div
        ref={cardRef}
        className="signin-card signup-card"
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

          <h1>Create your account</h1>

          <p>
            Build your professional portfolio and
            showcase your career.
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
          {/* Full name */}

          <div className="signin-field">
            <label htmlFor="fullName">
              Full name
            </label>

            <Input
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
              placeholder="Create a password"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {/* Confirm password */}

          <div className="signin-field">
            <label htmlFor="confirmPassword">
              Confirm password
            </label>

            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {/* Submit */}

          <button
            type="submit"
            className="signin-button"
            disabled={loading}
          >
            <span>
              {loading
                ? "Creating account..."
                : "Create account"}
            </span>

            {!loading && (
              <span className="signin-button-arrow">
                →
              </span>
            )}
          </button>
        </form>

        {/* Sign in */}

        <div className="signin-divider" />

        <p className="signin-signup">
          Already have an account?{" "}
          <Link to="/auth/sign-in">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}