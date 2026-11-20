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
import AuthLayout from "../../components/layout/AuthLayout";
import { useApp } from "../../app/providers";

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openPaymentModal } = useApp();


  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
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

      console.log(
        "Firebase Sign In successful:",
        user.uid
      );

      console.log(
        "Signed in email:",
        user.email
      );

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

      console.log(
        "Firebase ID token obtained successfully."
      );

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

      console.log(
        "POST /api/users response:",
        {
          status: response.status,
          statusText: response.statusText,
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

      console.log(
        "MongoDB user:",
        result?.user
      );

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

  /* -----------------------------------------
     Render
  ----------------------------------------- */

  return (
    <AuthLayout
      title="Sign in"
      lede="Sign in to manage your portfolio."
      footer={
        <p>
          New to WestForce?{" "}
          <Link to="/auth/sign-up">Create an account</Link>
        </p>
      }
    >
      {location.state?.signupNotice && (
        <p className="auth-notice" role="status">
          {location.state.signupNotice}
        </p>
      )}

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <Input
          id="email"
          name="email"
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={loading}
          required
        />

        <div className="auth-field-group">
          <Input
            id="password"
            name="password"
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
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
          className="full-width"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
