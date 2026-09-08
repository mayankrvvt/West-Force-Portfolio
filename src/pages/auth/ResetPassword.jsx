import { Link } from "react-router-dom";
import { useState } from "react";

import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

export default function ResetPassword() {
  const [done, setDone] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    setDone(true);
  }

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
              Password reset UI is ready for
              backend integration.
            </p>

            <Link to="/auth/sign-in">
              <Button className="full-width">
                Sign in
              </Button>
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <Input
              id="password"
              label="New password"
              type="password"
              required
              minLength={6}
            />

            <Input
              id="confirm"
              label="Confirm password"
              type="password"
              required
              minLength={6}
            />

            <Button
              type="submit"
              className="full-width"
            >
              Reset password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}