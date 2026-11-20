import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

import { auth } from "../../firebase/firebase";

import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import AuthLayout, { AuthAlert } from "../../components/layout/AuthLayout";
import PasswordField from "./PasswordField";
import { useApp } from "../../app/providers";
import { DEMO_MODE, signInDemo } from "../../demo/demoMode";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSignIn({ email, password }) {
  const errors = {};

  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter an email like name@example.com.";
  }

  if (!password) {
    errors.password = "Enter your password.";
  }

  return errors;
}

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openPaymentModal } = useApp();


  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

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

    if (fieldErrors[name]) {
      setFieldErrors((previous) => ({ ...previous, [name]: "" }));
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
        return "Sign in with email is turned off right now. Please try again later.";

      case "auth/user-token-expired":
        return "Your session expired. Please sign in again.";

      case "auth/requires-recent-login":
        return "Please sign in again to continue.";

      default:
        return `Sign in failed (${errorCode || "unknown error"}). Check your details and try again.`;
    }
  };

  /* -----------------------------------------
     Safely read backend response
  ----------------------------------------- */

  const readBackendResponse = async (response) => {
    const contentType =
      response.headers.get("content-type") || "";

    /*
     * JSON response
     */
    if (contentType.includes("application/json")) {
      try {
        return await response.json();
      } catch (jsonError) {
        console.error(
          "Failed to parse backend JSON:",
          jsonError
        );

        return {
          success: false,
          message: `Backend returned invalid JSON (${response.status}).`,
        };
      }
    }

    /*
     * Empty / text / HTML response
     */
    const text = await response.text();

    console.error(
      "Backend returned a non-JSON response:",
      {
        status: response.status,
        statusText: response.statusText,
        contentType,
        body: text,
      }
    );

    return {
      success: false,
      message:
        text ||
        `Backend request failed (${response.status} ${response.statusText}).`,
    };
  };

  /* -----------------------------------------
     Firebase Sign In
  ----------------------------------------- */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const email = formData.email.trim();
    const password = formData.password;

    /* -----------------------------------------
       Validate form
    ----------------------------------------- */

    const errors = validateSignIn({ email, password });
    setFieldErrors(errors);

    const firstInvalid = Object.keys(errors)[0];

    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setLoading(true);

    try {
      /* -----------------------------------------
         Keep user logged in after refreshing
      ----------------------------------------- */

      await setPersistence(
        auth,
        browserLocalPersistence
      );

      /* -----------------------------------------
         Sign in with Firebase
      ----------------------------------------- */

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = userCredential.user;

      /* -----------------------------------------
         Get Firebase ID token

         forceRefresh = true makes sure we send
         a fresh token to the backend.
      ----------------------------------------- */

      const token = await user.getIdToken(true);

      if (!token) {
        throw new Error(
          "Firebase authentication token could not be created."
        );
      }

      /* -----------------------------------------
         Create / find user in MongoDB
      ----------------------------------------- */

      const response = await fetch(
        "/api/users",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            email: user.email || email,
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
          }),
        }
      );

      /* -----------------------------------------
         Safely parse backend response

         IMPORTANT:
         Never call response.json() directly
         because a 403 can have an empty body.
      ----------------------------------------- */

      const result =
        await readBackendResponse(response);

      /* -----------------------------------------
         Handle backend failure
      ----------------------------------------- */

      if (!response.ok) {
        console.error(
          "Backend user request failed:",
          {
            status: response.status,
            statusText: response.statusText,
            result,
          }
        );

        if (response.status === 401) {
          throw new Error(
            result?.message ||
              "Authentication failed. Please sign in again."
          );
        }

        if (response.status === 403) {
          throw new Error(
            result?.message ||
              "Access denied by the backend. Please check your account permissions."
          );
        }

        throw new Error(
          result?.message ||
            result?.error ||
            `Backend rejected the request (${response.status}).`
        );
      }

      /* -----------------------------------------
         Verify successful backend response
      ----------------------------------------- */

      /* -----------------------------------------
         Navigate

         If user originally tried to access
         a protected page, return them there.

         Otherwise go to onboarding.
      ----------------------------------------- */

      const destination =
        location.state?.from?.pathname ||
        "/onboarding/create-portfolio";

      if (location.state?.purchasePlan) {
        openPaymentModal(
          "Continue with your selected plan.",
          location.state.purchasePlan
        );
      }

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
        firebaseError?.code
      );

      console.error(
        "Error Message:",
        firebaseError?.message
      );

      /* -----------------------------------------
         Firebase errors
      ----------------------------------------- */

      if (
        firebaseError?.code &&
        firebaseError.code.startsWith("auth/")
      ) {
        setError(
          getFirebaseErrorMessage(
            firebaseError.code
          )
        );
      } else {
        /* -----------------------------------------
           Backend / network errors
        ----------------------------------------- */

        setError(
          firebaseError?.message ||
            "Sign in failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /* Local-dev-only demo login (never in production builds). */
  const continueAsDemo = () => {
    signInDemo();
    navigate(location.state?.from?.pathname || "/dashboard", {
      replace: true,
    });
  };

  /* -----------------------------------------
     Render
  ----------------------------------------- */

  return (
    <AuthLayout
      title="Welcome back"
      lede="Sign in to update your portfolio and share it with employers."
      footer={
        <p>
          New to WestForce?{" "}
          <Link to="/auth/sign-up">Create an account</Link>
        </p>
      }
    >
      {location.state?.signupNotice && (
        <AuthAlert tone="success">{location.state.signupNotice}</AuthAlert>
      )}

      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Input
          id="email"
          name="email"
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          error={fieldErrors.email}
          disabled={loading}
          required
        />

        <div className="auth-field-group">
          <PasswordField
            id="password"
            name="password"
            label="Password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            error={fieldErrors.password}
            disabled={loading}
            required
          />

          <Link to="/auth/forgot-password" className="auth-inline-link">
            Forgot your password?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          className="full-width auth-submit"
          disabled={loading}
          aria-busy={loading || undefined}
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {DEMO_MODE && (
        <div className="auth-demo">
          <p className="auth-divider">
            <span>or</span>
          </p>

          <Button
            variant="secondary"
            size="lg"
            className="full-width"
            onClick={continueAsDemo}
            disabled={loading}
          >
            Explore the demo account
          </Button>

          <p className="auth-demo-note">
            Signs you in as Emma Tremblay, a sample job seeker. Changes stay on this device.
          </p>
        </div>
      )}
    </AuthLayout>
  );
}
