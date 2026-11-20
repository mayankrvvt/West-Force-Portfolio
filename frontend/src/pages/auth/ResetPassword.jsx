import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";

import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import AuthLayout from "../../components/layout/AuthLayout";

import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";

import { auth } from "../../firebase/firebase";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();

  const oobCode = searchParams.get("oobCode");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!oobCode) {
      setError(
        "This password reset link is invalid or incomplete."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters long."
      );
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Verify that the reset code is still valid
      await verifyPasswordResetCode(
        auth,
        oobCode
      );

      // Set the new password
      await confirmPasswordReset(
        auth,
        oobCode,
        password
      );

      setDone(true);
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
    <AuthLayout
      title={done ? "Password updated" : "Set a new password"}
      lede={
        done
          ? "You can now sign in with your new password."
          : "Choose a password with at least 8 characters."
      }
      footer={
        done ? undefined : (
          <p>
            Link not working?{" "}
            <Link to="/auth/forgot-password">Request a new one</Link>
          </p>
        )
      }
    >
      {done ? (
        <Link to="/auth/sign-in" className="btn btn-primary btn-lg full-width">
          Sign in
        </Link>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <Input
            id="password"
            name="password"
            label="New password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            autoComplete="new-password"
            minLength={8}
            disabled={loading}
            required
          />

          <Input
            id="confirm"
            name="confirm"
            label="Confirm new password"
            type="password"
            value={confirm}
            onChange={(event) =>
              setConfirm(event.target.value)
            }
            autoComplete="new-password"
            minLength={8}
            disabled={loading}
            required
          />

          <Button
            type="submit"
            size="lg"
            className="full-width"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save new password"}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
