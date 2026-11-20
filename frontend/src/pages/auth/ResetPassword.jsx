import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { CheckCircle2, Link2Off } from "lucide-react";

import Button from "../../components/common/Button";
import AuthLayout, { AuthAlert } from "../../components/layout/AuthLayout";
import PasswordField from "./PasswordField";

import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";

import { auth } from "../../firebase/firebase";
import { DEMO_MODE } from "../../demo/demoMode";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();

  const oobCode = searchParams.get("oobCode");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const getFirebaseErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/expired-action-code":
        return "This password reset link has expired. Please request a new one.";

      case "auth/invalid-action-code":
        return "This password reset link is invalid or has already been used.";

      case "auth/user-disabled":
        return "This account has been disabled.";

      case "auth/user-not-found":
        return "This account could not be found.";

      case "auth/weak-password":
        return "Please choose a stronger password.";

      default:
        return "Unable to reset your password. Please try again.";
    }
  };

  const clearErrors = (name) => {
    if (error) setError("");
    if (fieldErrors[name]) {
      setFieldErrors((previous) => ({ ...previous, [name]: "" }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!oobCode) {
      setError(
        "This password reset link is invalid or incomplete."
      );
      return;
    }

    const errors = {};

    if (password.length < 8) {
      errors.password = password ? "Use at least 8 characters." : "Choose a new password.";
    }

    if (!confirm) {
      errors.confirm = "Type your new password again.";
    } else if (password !== confirm) {
      errors.confirm = "Passwords do not match.";
    }

    setFieldErrors(errors);

    const firstInvalid = ["password", "confirm"].find((name) => errors[name]);

    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setLoading(true);

    try {
      // The literal DEV check lets Vite drop this branch (DEMO_MODE alone leaves a demo chunk).
      if (import.meta.env.DEV && DEMO_MODE) {
        await (await import("../../demo/demoApi")).demoActionCode("resetPassword", oobCode);
      } else {
        // Check the code is still valid, then set the new password.
        await verifyPasswordResetCode(auth, oobCode);
        await confirmPasswordReset(auth, oobCode, password);
      }

      setDone(true);
    } catch (resetError) {
      setError(
        getFirebaseErrorMessage(
          resetError.code
        )
      );
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthLayout
        icon={<CheckCircle2 size={22} />}
        title="Password updated"
        lede="You can now sign in with your new password."
      >
        <Link to="/auth/sign-in" className="btn btn-primary btn-lg full-width">
          Sign in
        </Link>
      </AuthLayout>
    );
  }

  /* No code in the link: say so up front instead of after they type a password. */
  if (!oobCode) {
    return (
      <AuthLayout
        icon={<Link2Off size={22} />}
        title="This link is not complete"
        lede="Reset links only work once and expire after a while. Ask for a new one and use the newest email."
      >
        <Link to="/auth/forgot-password" className="btn btn-primary btn-lg full-width">
          Send a new reset link
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Choose a new password"
      lede="Use at least 8 characters. You will use it the next time you sign in."
      footer={
        <p>
          Link not working?{" "}
          <Link to="/auth/forgot-password">Request a new one</Link>
        </p>
      }
    >
      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <PasswordField
          id="password"
          name="password"
          label="New password"
          rule={8}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            clearErrors("password");
          }}
          autoComplete="new-password"
          error={fieldErrors.password}
          disabled={loading}
          required
        />

        <PasswordField
          id="confirm"
          name="confirm"
          label="Confirm new password"
          value={confirm}
          onChange={(event) => {
            setConfirm(event.target.value);
            clearErrors("confirm");
          }}
          autoComplete="new-password"
          error={fieldErrors.confirm}
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
          {loading ? "Saving…" : "Save new password"}
        </Button>
      </form>
    </AuthLayout>
  );
}
