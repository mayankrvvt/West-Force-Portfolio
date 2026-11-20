import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import AuthLayout, { AuthAlert } from "../../components/layout/AuthLayout";
import PasswordField from "./PasswordField";

import {
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from "firebase/auth";

import { auth } from "../../firebase/firebase";
import { db } from "../../firebase/firestore";
import { PAUSED_TEXT, useFeature } from "../../hooks/useSiteStatus";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELD_ORDER = ["fullName", "email", "password", "confirmPassword"];

/* One message per field, shown under that field. */
function validateSignUpField(name, values) {
  switch (name) {
    case "fullName":
      return values.fullName.trim() ? "" : "Enter your full name.";

    case "email": {
      const email = values.email.trim();
      if (!email) return "Enter your email address.";
      return EMAIL_PATTERN.test(email) ? "" : "Enter an email like name@example.com.";
    }

    case "password":
      if (!values.password) return "Choose a password.";
      return values.password.length >= 8 ? "" : "Use at least 8 characters.";

    case "confirmPassword":
      if (!values.confirmPassword) return "Type your password again.";
      return values.confirmPassword === values.password ? "" : "Passwords do not match.";

    default:
      return "";
  }
}

export default function SignUp() {
  const navigate = useNavigate();
  const signupsOn = useFeature("signups");


  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
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

    if (fieldErrors[name]) {
      setFieldErrors((previous) => ({ ...previous, [name]: "" }));
    }

    // A "Passwords do not match" on the confirm field is about both fields.
    if (name === "password" && fieldErrors.confirmPassword) {
      setFieldErrors((previous) => ({ ...previous, confirmPassword: "" }));
    }
  };

  /*
   * Check a field when the person leaves it, but only once they typed
   * something. The password has its own live length check, so it waits
   * for submit (leaving it to press show/hide should not raise an error).
   */
  const handleBlur = (event) => {
    const { name } = event.target;

    if (!formData[name] || name === "password") return;

    setFieldErrors((previous) => ({
      ...previous,
      [name]: validateSignUpField(name, formData),
    }));
  };

  /* -----------------------------------------
     Firebase error messages
  ----------------------------------------- */

  const getFirebaseErrorMessage = (errorCode) => {
    switch (errorCode) {
      case "auth/email-already-in-use":
        return "An account with this email already exists. Please sign in instead.";

      case "auth/invalid-email":
        return "Please enter a valid email address.";

      case "auth/weak-password":
        return "Password is too weak. Please use at least 8 characters.";

      case "auth/operation-not-allowed":
        return "Sign up with email is turned off right now. Please try again later.";

      case "auth/network-request-failed":
        return "Network error. Please check your internet connection.";

      case "permission-denied":
        return "Your account was created, but Firestore access was denied. Please check your Firebase security rules.";

      case "failed-precondition":
        return "Firestore is not configured correctly. Please make sure the Firestore database has been created.";

      default:
        return `Firebase error: ${errorCode || "unknown-error"}`;
    }
  };

  /* -----------------------------------------
     Sign up
  ----------------------------------------- */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!signupsOn) return;

    const fullName = formData.fullName.trim();
    const email = formData.email.trim();
    const password = formData.password;

    const errors = {};

    FIELD_ORDER.forEach((name) => {
      const message = validateSignUpField(name, formData);
      if (message) errors[name] = message;
    });

    setFieldErrors(errors);

    const firstInvalid = FIELD_ORDER.find((name) => errors[name]);

    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setLoading(true);
    let accountCreated = false;
    let profileSetupTimeout;

    try {
      /* -----------------------------------------
         1. Keep Firebase session persistent
      ----------------------------------------- */

      await setPersistence(
        auth,
        browserLocalPersistence
      );

      /* -----------------------------------------
         2. Create Firebase Authentication user
      ----------------------------------------- */

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = userCredential.user;
      accountCreated = true;

      /* -----------------------------------------
         3. Save user's name in Firebase Auth
      ----------------------------------------- */

      await updateProfile(user, {
        displayName: fullName,
      });

      /* -----------------------------------------
         4. Create Firestore user document
      ----------------------------------------- */

      const profileWrites = Promise.all([
        setDoc(
          doc(db, "users", user.uid),
          {
            uid: user.uid,
            fullName,
            email,

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        ),
        setDoc(
          doc(db, "portfolios", user.uid),
          {
            userId: user.uid,

            personalInfo: {
              fullName,
              email,
            },

            education: [],
            experience: [],
            skills: [],
            projects: [],
            certifications: [],

            isPublished: false,

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        ),
      ]);

      await Promise.race([
        profileWrites,
        new Promise((_, reject) => {
          profileSetupTimeout = window.setTimeout(() => {
            reject(new Error("Firestore profile setup timed out."));
          }, 10000);
        }),
      ]);

      /* -----------------------------------------
         6. Account successfully created
         
         Firebase automatically signs the user in
         after createUserWithEmailAndPassword().
         
         We sign them out because your desired
         flow is:
         
         Sign Up → Sign In → Dashboard
      ----------------------------------------- */

      await signOut(auth);

      /* -----------------------------------------
         7. Redirect to Sign In
      ----------------------------------------- */

      navigate("/auth/sign-in", {
        replace: true,
        state: {
          signupNotice:
            "Your account was created successfully. Please sign in.",
        },
      });
    } catch (signupError) {
      console.error(
        "Firebase Sign Up Error:",
        signupError
      );

      console.error(
        "Firebase Error Code:",
        signupError.code
      );

      console.error(
        "Firebase Error Message:",
        signupError.message
      );

      if (accountCreated) {
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.error(
            "Could not sign out after account creation:",
            signOutError
          );
        }

        navigate("/auth/sign-in", {
          replace: true,
          state: {
            signupNotice:
              "Your account was created, but profile setup could not be confirmed. Check that the default Firestore database exists in Firebase Console before continuing.",
          },
        });
      } else {
        setError(
          getFirebaseErrorMessage(
            signupError.code
          )
        );
      }
    } finally {
      window.clearTimeout(profileSetupTimeout);
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      lede="It takes a minute. You can add your resume and documents after you sign up."
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/auth/sign-in">Sign in</Link>
        </p>
      }
    >
      {!signupsOn && (
        <AuthAlert tone="info">
          {PAUSED_TEXT.signups}. Please check back soon. If you already have an account, you can still sign in.
        </AuthAlert>
      )}

      {error && <AuthAlert tone="error">{error}</AuthAlert>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <fieldset className="auth-fieldset" disabled={!signupsOn}>
        <Input
          id="fullName"
          name="fullName"
          label="Full name"
          type="text"
          value={formData.fullName}
          onChange={handleChange}
          onBlur={handleBlur}
          autoComplete="name"
          error={fieldErrors.fullName}
          disabled={loading}
        />

        <Input
          id="email"
          name="email"
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="you@example.com"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          error={fieldErrors.email}
          disabled={loading}
        />

        <PasswordField
          id="password"
          name="password"
          label="Password"
          rule={8}
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          autoComplete="new-password"
          error={fieldErrors.password}
          disabled={loading}
        />

        <PasswordField
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm password"
          value={formData.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
          disabled={loading}
        />

        <Button
          type="submit"
          size="lg"
          className="full-width auth-submit"
          disabled={loading}
          aria-busy={loading || undefined}
        >
          {loading ? "Creating your account…" : "Create account"}
        </Button>
        </fieldset>
      </form>
    </AuthLayout>
  );
}
