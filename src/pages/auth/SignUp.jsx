import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Input from "../../components/common/Input";
import { signUpUser } from "../../services/authService";

export default function SignUp() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
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

    const fullName = formData.fullName.trim();
    const email = formData.email.trim();
    const password = formData.password;

    // Validation
    if (!fullName) {
      setError("Please enter your full name.");
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter a password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      // Create account through Supabase
      const data = await signUpUser({
        fullName,
        email,
        password,
      });

      console.log("Signup successful:", data);

      /*
       * If email confirmation is enabled in Supabase,
       * the user needs to verify their email before signing in.
       *
       * We send them to the sign-in page after successful signup.
       */
      navigate("/auth/sign-in");
    } catch (error) {
      console.error("Signup error:", error);

      setError(
        error?.message ||
          "Unable to create your account. Please try again."
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

        <h1>Create your portfolio</h1>

        <p>
          Start building your professional profile.
        </p>

        {/* Error message */}
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

        {/* Signup form */}
        <form onSubmit={handleSubmit}>

          {/* Full name */}
          <div className="input-group">
            <label htmlFor="fullName">
              Full name
            </label>

            <Input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              disabled={loading}
            />
          </div>

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
              placeholder="Create a password"
              autoComplete="new-password"
              disabled={loading}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : "Create account"}
          </button>

        </form>

        {/* Sign in */}
        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/auth/sign-in">
            Sign in
          </Link>
        </p>

      </div>
    </main>
  );
}