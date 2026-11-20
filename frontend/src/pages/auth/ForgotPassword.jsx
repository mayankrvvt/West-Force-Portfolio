import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";

import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import AuthLayout, { AuthAlert } from "../../components/layout/AuthLayout";

import {
  sendPasswordResetEmail,
} from "firebase/auth";

import { auth } from "../../firebase/firebase";
import { publicApiRequest } from "../../utils/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Our server sends the branded email when mail is live. Until then it answers
 * fallback "firebase" and Firebase's own email is sent from here. Either way
 * the screen is the same, so nobody learns which emails have accounts.
 */
async function requestResetLink(email) {
  const result = await publicApiRequest("/api/auth/password-reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (result?.fallback !== "firebase") return;

  try {
    await sendPasswordResetEmail(auth, email);
  } catch (firebaseError) {
    if (firebaseError?.code !== "auth/user-not-found") throw firebaseError;
  }
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);

  const getErrorMessage = (resetError) => {
    // Our API answers with a message to show (bad email, too many requests).
    if (resetError?.status && resetError.message) return resetError.message;

    switch (resetError?.code) {
      case "auth/invalid-email":
        return "Please enter a valid email address.";

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
    setFieldError("");
    setSent(false);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setFieldError("Enter the email you signed up with.");
      document.getElementById("email")?.focus();
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setFieldError("Enter an email like name@example.com.");
      document.getElementById("email")?.focus();
      return;
    }

    setLoading(true);

    try {
      await requestResetLink(trimmedEmail);

      setSent(true);
    } catch (resetError) {
      setError(getErrorMessage(resetError));
    } finally {
      setLoading(false);
    }
  };

  const backToSignIn = (
    <p>
      <Link to="/auth/sign-in" className="auth-back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to sign in
      </Link>
    </p>
  );

  if (sent) {
    return (
      <AuthLayout
        icon={<MailCheck size={22} />}
        title="Check your email"
        footer={backToSignIn}
      >
        <div className="auth-sent" role="status">
          <p>
            If an account uses <strong>{email.trim()}</strong>, we sent a reset link to it.
          </p>
          <p>
            Open it to choose a new password. If it is not in your inbox in a
            few minutes, check your spam folder.
          </p>
        </div>

        <Button
          variant="secondary"
          size="lg"
          className="full-width"
          onClick={() => setSent(false)}
        >
          Use a different email
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      lede="Enter the email you signed up with. We will send you a link to choose a new password."
      footer={backToSignIn}
    >
      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <Input
          id="email"
          name="email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldError) setFieldError("");
            if (error) setError("");
          }}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          error={fieldError}
          disabled={loading}
          required
        />

        <Button
          type="submit"
          size="lg"
          className="full-width auth-submit"
          disabled={loading}
          aria-busy={loading || undefined}
        >
          {loading ? "Sending link…" : "Send reset link"}
        </Button>
      </form>
    </AuthLayout>
  );
}
