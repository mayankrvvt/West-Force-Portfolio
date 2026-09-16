import { useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

import { auth } from "../../firebase/firebase";

import gsap from "gsap";

import Input from "../../components/common/Input";

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
     Firebase error messages
  ----------------------------------------- */

  const getFirebaseErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/invalid-email":
        return "Please enter a valid email address.";

      case "auth/invalid-credential":
        return "Incorrect email or password.";

      case "auth/wrong-password":
        return "Incorrect password.";

      case "auth/user-not-found":
        return "No account exists with this email address.";

      case "auth/user-disabled":
        return "This account has been disabled.";

      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";

      case "auth/network-request-failed":
        return "Network error. Please check your internet connection.";

      case "auth/operation-not-allowed":
        return "Email/password sign-in is not enabled in Firebase.";

      default:
        return `Firebase error: ${errorCode || "unknown-error"}`;
    }
  };

  /* -----------------------------------------
     Firebase Sign In
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
    /*
     * Keep user logged in after refreshing
     */
    await setPersistence(
      auth,
      browserLocalPersistence
    );

    /*
     * Sign in with Firebase
     */
    const userCredential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

    const user = userCredential.user;

    console.log(
      "Firebase Sign In successful:",
      user.uid
    );

    console.log(
      "Signed in email:",
      user.email
    );

    /*
     * Get Firebase ID token
     *
     * This token proves to the backend
     * which Firebase user is signed in.
     */
    const token = await user.getIdToken();

    /*
     * Create/find the user in MongoDB
     */
    const response = await fetch(
  "/api/users",
  {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },

    body: JSON.stringify({
      email: user.email || email,
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
    }),
  }
);

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message ||
          "Failed to connect with the backend."
      );
    }

    console.log(
      "MongoDB user:",
      result.user
    );

    /*
     * If the user originally tried to access
     * a protected page, return them there.
     *
     * Otherwise go to onboarding.
     */
    const destination =
      location.state?.from?.pathname ||
      "/onboarding/create-portfolio";

    navigate(destination, {
      replace: true,
    });
  } catch (firebaseError) {
    console.error(
      "Sign In Error:",
      firebaseError
    );

    console.error(
      "Error Code:",
      firebaseError.code
    );

    console.error(
      "Error Message:",
      firebaseError.message
    );

    /*
     * Backend errors don't have Firebase
     * auth error codes, so show their message.
     */
    if (
      firebaseError.message &&
      !firebaseError.code?.startsWith("auth/")
    ) {
      setError(firebaseError.message);
    } else {
      setError(
        getFirebaseErrorMessage(
          firebaseError.code
        )
      );
    }
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
              required
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
              required
            />
          </div>

          {/* Forgot password */}

          <Link
            to="/auth/forgot-password"
            className="signin-forgot"
          >
            Forgot your password?
          </Link>

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

        {/* Sign up */}

        <div className="signin-divider" />

        <p className="signin-signup">
          Don't have an account?{" "}
          <Link to="/auth/sign-up">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}