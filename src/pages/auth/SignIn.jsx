import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import Input from "../../components/common/Input";
import { signInUser } from "../../services/authService";

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const email = formData.email.trim();
    const password = formData.password;

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
      await signInUser({
        email,
        password,
      });

      // If the user was redirected to sign-in
      // from a protected page, send them back there.
      const destination =
        location.state?.from?.pathname || "/dashboard";

      navigate(destination, {
        replace: true,
      });
    } catch (error) {
      console.error("Sign in error:", error);

      setError(
        error?.message ||
          "Unable to sign in. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">

        {/* Logo */}
        <Link
          to="/"
          className="auth-logo"
          aria-label="WestForce home"
        >
          <img
            src="/favicon.png"
            alt="WestForce"
          />
        </Link>

        {/* Header */}
        <p className="eyebrow">
          WESTFORCE PORTFOLIO
        </p>

        <h1>Welcome back</h1>

        <p>
          Sign in to access your professional portfolio.
        </p>

        {/* Error */}
        {error && (
          <div
            role="alert"
            style={{
              marginBottom: "18px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              color: "#be123c",
              fontSize: "13px",
              lineHeight: "1.5",
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>

          {/* Email */}
          <div className="input-group">
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
          <div className="input-group">
            <label htmlFor="password">
              Password
            </label>

            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {/* Forgot password */}
          <Link
            to="/auth/forgot-password"
            className="auth-link"
          >
            Forgot your password?
          </Link>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign in"}
          </button>

        </form>

        {/* Signup */}
        <p className="auth-switch">
          Don't have an account?{" "}
          <Link to="/auth/sign-up">
            Create an account
          </Link>
        </p>

      </div>
    </main>
  );
}