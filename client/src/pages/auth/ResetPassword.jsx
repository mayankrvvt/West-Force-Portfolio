import { Link, useSearchParams } from "react-router-dom";
import { useState } from "react";

import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

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

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters long."
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
    <div className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">
          ACCOUNT RECOVERY
        </p>

        <h1>Reset password</h1>

        {done ? (
          <>
            <p>
              Your password has been successfully
              reset.
            </p>

            <p>
              You can now sign in using your new
              password.
            </p>

            <Link to="/auth/sign-in">
              <Button className="full-width">
                Sign in
              </Button>
            </Link>
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
              id="password"
              name="password"
              label="New password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Enter new password"
              autoComplete="new-password"
              minLength={6}
              disabled={loading}
              required
            />

            <Input
              id="confirm"
              name="confirm"
              label="Confirm password"
              type="password"
              value={confirm}
              onChange={(event) =>
                setConfirm(event.target.value)
              }
              placeholder="Confirm new password"
              autoComplete="new-password"
              minLength={6}
              disabled={loading}
              required
            />

            <Button
              type="submit"
              className="full-width"
              disabled={loading}
            >
              {loading
                ? "Resetting..."
                : "Reset password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}