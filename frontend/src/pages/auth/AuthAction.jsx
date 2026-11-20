import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { CheckCircle2, Link2Off, MailCheck } from "lucide-react";

import AuthLayout from "../../components/layout/AuthLayout";
import ResetPassword from "./ResetPassword";

import { applyActionCode, checkActionCode } from "firebase/auth";

import { auth } from "../../firebase/firebase";
import { DEMO_MODE } from "../../demo/demoMode";
import { apiRequest } from "../../utils/api";

/*
 * One page for every email link: our branded Resend emails and Firebase's
 * own emails (when the Firebase action URL points here) use the same
 * ?mode=...&oobCode=... format.
 */

const CODE_MODES = new Set(["verifyEmail", "verifyAndChangeEmail", "recoverEmail"]);

function errorMessage(code) {
  switch (code) {
    case "auth/expired-action-code":
      return "This link has expired. Ask for a new one and use the newest email.";
    case "auth/invalid-action-code":
      return "This link is not valid or was already used. Links only work once.";
    case "auth/user-disabled":
      return "This account has been turned off. Contact us if you think this is a mistake.";
    case "auth/network-request-failed":
      return "We could not reach the server. Check your connection and open the link again.";
    default:
      return "We could not use this link. Please open it again or ask for a new one.";
  }
}

// A code works once, so remember each try: React's dev double effect (and a
// remount) must reuse it rather than spend the code twice.
const tries = new Map();

function runCode(mode, oobCode) {
  const key = `${mode}:${oobCode}`;
  if (!tries.has(key)) tries.set(key, applyCode(mode, oobCode));
  return tries.get(key);
}

/** Use the one time code. Returns the email Firebase tied to it. */
async function applyCode(mode, oobCode) {
  // The literal DEV check lets Vite drop this branch (DEMO_MODE alone leaves a demo chunk).
  if (import.meta.env.DEV && DEMO_MODE) return (await import("../../demo/demoApi")).demoActionCode(mode, oobCode);

  // checkActionCode first: once applied, the code no longer says which email it was for.
  const info = await checkActionCode(auth, oobCode);
  await applyActionCode(auth, oobCode);

  if (mode === "verifyEmail") await recordVerified();

  return { mode, email: info?.data?.email || "" };
}

/**
 * When the person is signed in on this device, refresh their account so the
 * app sees the verified email, and tell our server (it stores the flag and
 * sends the welcome email once). Failures here never undo the verification.
 */
async function recordVerified() {
  try {
    await auth.authStateReady();
    const user = auth.currentUser;
    if (!user) return;

    await user.reload();
    await user.getIdToken(true);
    await apiRequest("/api/auth/email-verified", { method: "POST" });
  } catch {
    // The next sign in syncs it instead.
  }
}

const signInLink = (
  <Link to="/auth/sign-in" className="btn btn-primary btn-lg full-width">
    Sign in
  </Link>
);

function CodeAction({ mode, oobCode }) {
  const [state, setState] = useState({ status: "working", email: "", error: "" });

  useEffect(() => {
    let active = true;

    runCode(mode, oobCode)
      .then((result) => active && setState({ status: "done", email: result.email, error: "" }))
      .catch((error) => active && setState({ status: "failed", email: "", error: errorMessage(error?.code) }));

    return () => {
      active = false;
    };
  }, [mode, oobCode]);

  if (state.status === "working") {
    return (
      <AuthLayout title="Checking your link" lede="This takes a moment.">
        <div className="auth-progress" role="status" aria-busy="true">
          <span className="auth-skeleton" aria-hidden="true" />
          <span className="auth-skeleton auth-skeleton-short" aria-hidden="true" />
          Checking your link...
        </div>
      </AuthLayout>
    );
  }

  if (state.status === "failed") {
    return (
      <AuthLayout
        icon={<Link2Off size={22} />}
        title="This link did not work"
        lede={state.error}
        footer={
          <p>
            Already sorted? <Link to="/auth/sign-in">Sign in</Link>
          </p>
        }
      >
        <Link to="/dashboard" className="btn btn-primary btn-lg full-width">
          Go to your dashboard
        </Link>
      </AuthLayout>
    );
  }

  if (mode === "verifyAndChangeEmail") {
    return (
      <AuthLayout icon={<MailCheck size={22} />} title="Email changed">
        <div className="auth-sent" role="status">
          <p>
            Your account email is now <strong>{state.email || "your new address"}</strong>.
          </p>
          <p>Sign in again with your new email.</p>
        </div>
        {signInLink}
      </AuthLayout>
    );
  }

  if (mode === "recoverEmail") {
    return (
      <AuthLayout
        icon={<CheckCircle2 size={22} />}
        title="Email changed back"
        footer={
          <p>
            <Link to="/auth/sign-in">Sign in</Link>
          </p>
        }
      >
        <div className="auth-sent" role="status">
          <p>
            Your account email is <strong>{state.email || "your old address"}</strong> again.
          </p>
          <p>If you did not ask for the change, reset your password now to keep your account safe.</p>
        </div>
        <Link to="/auth/forgot-password" className="btn btn-primary btn-lg full-width">
          Reset your password
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={<CheckCircle2 size={22} />}
      title="Email verified"
      lede="Thanks. Your email is confirmed, so you can use every part of WestForce."
    >
      <Link to="/dashboard" className="btn btn-primary btn-lg full-width">
        Go to your dashboard
      </Link>
    </AuthLayout>
  );
}

export default function AuthAction() {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "";
  const oobCode = searchParams.get("oobCode") || "";

  // ResetPassword reads the code from the same address.
  if (mode === "resetPassword") return <ResetPassword />;

  if (oobCode && CODE_MODES.has(mode)) return <CodeAction key={oobCode} mode={mode} oobCode={oobCode} />;

  return (
    <AuthLayout
      icon={<Link2Off size={22} />}
      title="This link is not complete"
      lede="Open the newest email we sent you and use its button, or copy the whole link into your browser."
    >
      {signInLink}
    </AuthLayout>
  );
}
