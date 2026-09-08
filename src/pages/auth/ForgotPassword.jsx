import { Link } from "react-router-dom";
import { useState } from "react";

import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">
          ACCOUNT RECOVERY
        </p>

        <h1>Forgot password?</h1>

        {sent ? (
          <p>
            Reset instructions are ready for
            backend integration.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <Input
              id="email"
              label="Email"
              type="email"
              required
            />

            <Button
              type="submit"
              className="full-width"
            >
              Send reset link
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