import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import AuthLayout from "../../components/layout/AuthLayout";

import {
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  signOut,
} from "firebase/auth";

import { auth } from "../../firebase/firebase";
import { db } from "../../firebase/firestore";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function SignUp() {
  const navigate = useNavigate();


  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
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
        return "Email/password authentication is not enabled in Firebase.";

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

    const fullName = formData.fullName.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

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

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
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

      console.log(
        "Firebase user created:",
        user.uid
      );

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

      console.log(
        "Signup completed successfully."
      );

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
      lede="Start your portfolio. You can add documents after you sign up."
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/auth/sign-in">Sign in</Link>
        </p>
      }
    >
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <Input
          id="fullName"
          name="fullName"
          label="Full name"
          type="text"
          value={formData.fullName}
          onChange={handleChange}
          autoComplete="name"
          disabled={loading}
        />

        <Input
          id="email"
          name="email"
          label="Email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={loading}
        />

        <Input
          id="password"
          name="password"
          label="Password"
          hint="At least 8 characters."
          type="password"
          value={formData.password}
          onChange={handleChange}
          autoComplete="new-password"
          disabled={loading}
        />

        <Input
          id="confirmPassword"
          name="confirmPassword"
          label="Confirm password"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
          disabled={loading}
        />

        <Button
          type="submit"
          size="lg"
          className="full-width"
          disabled={loading}
        >
          {loading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
