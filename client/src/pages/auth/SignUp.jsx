import { useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import gsap from "gsap";

import Input from "../../components/common/Input";

import {
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from "firebase/auth";

import { auth, db } from "../../firebase/firebase";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

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
     Firebase error messages
  ----------------------------------------- */

  const getFirebaseErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "An account with this email already exists. Please sign in instead.";

      case "auth/invalid-email":
        return "Please enter a valid email address.";

      case "auth/weak-password":
        return "Password is too weak. Please use at least 8 characters.";

      case "auth/operation-not-allowed":
        return "Email/password authentication is not enabled in Firebase.";

      case "auth/network-request-failed":
        return "Network error. Please check your internet connection.";

      case "permission-denied":
        return "Your account was created, but Firestore access was denied. Please check your Firebase security rules.";

      case "failed-precondition":
        return "Firestore is not configured correctly. Please make sure the Firestore database has been created.";

      default:
        return `Firebase error: ${errorCode || "unknown-error"}`;
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
      /* -----------------------------------------
         1. Keep Firebase session persistent
      ----------------------------------------- */

      await setPersistence(
        auth,
        browserLocalPersistence
      );

      /* -----------------------------------------
         2. Create Firebase Authentication user
      ----------------------------------------- */

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = userCredential.user;

      console.log(
        "Firebase user created:",
        user.uid
      );

      /* -----------------------------------------
         3. Save user's name in Firebase Auth
      ----------------------------------------- */

      await updateProfile(user, {
        displayName: fullName,
      });

      /* -----------------------------------------
         4. Create Firestore user document
      ----------------------------------------- */

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          fullName,
          email,

          paymentStatus: "unpaid",
          plan: null,

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      console.log(
        "Firestore user document created."
      );

      /* -----------------------------------------
         5. Create empty portfolio document
      ----------------------------------------- */

      await setDoc(
        doc(db, "portfolios", user.uid),
        {
          userId: user.uid,

          personalInfo: {
            fullName,
            email,
          },

          education: [],
          experience: [],
          skills: [],
          projects: [],
          certifications: [],

          isPublished: false,

          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }
      );

      console.log(
        "Firestore portfolio document created."
      );

      /* -----------------------------------------
         6. Account successfully created
         
         Firebase automatically signs the user in
         after createUserWithEmailAndPassword().
         
         We sign them out because your desired
         flow is:
         
         Sign Up → Sign In → Dashboard
      ----------------------------------------- */

      await signOut(auth);

      console.log(
        "Signup completed successfully."
      );

      /* -----------------------------------------
         7. Redirect to Sign In
      ----------------------------------------- */

      navigate("/auth/sign-in", {
        replace: true,
      });
    } catch (signupError) {
      console.error(
        "Firebase Sign Up Error:",
        signupError
      );

      console.error(
        "Firebase Error Code:",
        signupError.code
      );

      console.error(
        "Firebase Error Message:",
        signupError.message
      );

      setError(
        getFirebaseErrorMessage(
          signupError.code
        )
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