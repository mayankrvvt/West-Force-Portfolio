import { Link } from "react-router-dom";
import { useState } from "react";

import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

import {
  sendPasswordResetEmail,
} from "firebase/auth";

import { auth } from "../../firebase/firebase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const getFirebaseErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/invalid-email":
        return "Please enter a valid email address.";

      case "auth/user-not-found":
        return "No account exists with this email address.";

      case "auth/too-many-requests":
        return "Too many requests. Please try again later.";

      case "auth/network-request-failed":
        return "Network error. Please check your internet connection.";

      default:
        return "Unable to send the reset link. Please try again.";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSent(false);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(
        auth,
        trimmedEmail
      );

      setSent(true);
    } catch (resetError) {
      console.error(
        "Password reset error:",
        resetError
      );

      setError(
        getFirebaseErrorMessage(
          resetError.code
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">
          ACCOUNT RECOVERY
        </p>

        <h1>Forgot password?</h1>

        {sent ? (
          <>
            <p>
              We've sent a password reset link to{" "}
              <strong>{email}</strong>.
            </p>

            <p>
              Check your inbox and follow the
              instructions to create a new password.
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <div
                className="signin-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <Input
              id="email"
              name="email"
              label="Email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
              required
            />

            <Button
              type="submit"
              className="full-width"
              disabled={loading}
            >
              {loading
                ? "Sending..."
                : "Send reset link"}
            </Button>
          </form>
        )}

        <Link
          to="/auth/sign-in"
          className="auth-link"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}