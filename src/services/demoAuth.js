const DEMO_SESSION_KEY = "westforce_demo_session";
const DEMO_USER_KEY = "westforce_demo_user";

const DEMO_USER = {
  email: "demo@westforce.com",
  password: "WestForce123",
  fullName: "Demo User",
};

/* -----------------------------------------
   Get the current demo/local user
----------------------------------------- */

export function getDemoUser() {
  const storedUser = localStorage.getItem(DEMO_USER_KEY);

  if (!storedUser) {
    return DEMO_USER;
  }

  try {
    const parsedUser = JSON.parse(storedUser);

    if (
      !parsedUser?.email ||
      !parsedUser?.password ||
      !parsedUser?.fullName
    ) {
      localStorage.removeItem(DEMO_USER_KEY);
      return DEMO_USER;
    }

    return parsedUser;
  } catch {
    localStorage.removeItem(DEMO_USER_KEY);
    return DEMO_USER;
  }
}

/* -----------------------------------------
   Sign up local/demo user
----------------------------------------- */

export function signupDemoUser({
  fullName,
  email,
  password,
}) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (
    !fullName?.trim() ||
    !normalizedEmail ||
    !password
  ) {
    return {
      success: false,
      error: "All fields are required.",
    };
  }

  if (password.length < 6) {
    return {
      success: false,
      error: "Password must be at least 6 characters.",
    };
  }

  /*
    Never overwrite the permanent demo account.
  */

  if (normalizedEmail === DEMO_USER.email) {
    return {
      success: false,
      error:
        "This email belongs to the demo account. Please use another email.",
    };
  }

  const user = {
    fullName: fullName.trim(),
    email: normalizedEmail,
    password,
  };

  localStorage.setItem(
    DEMO_USER_KEY,
    JSON.stringify(user)
  );

  return {
    success: true,
    user: {
      fullName: user.fullName,
      email: user.email,
    },
  };
}

/* -----------------------------------------
   Login
----------------------------------------- */

export function loginWithDemoCredentials(
  email,
  password
) {
  const normalizedEmail = email?.trim().toLowerCase();

  /*
    Permanent demo credentials.
    These will ALWAYS work.
  */

  if (
    normalizedEmail === DEMO_USER.email &&
    password === DEMO_USER.password
  ) {
    return true;
  }

  /*
    Allow a locally registered demo user as well.
  */

  const storedUser = localStorage.getItem(
    DEMO_USER_KEY
  );

  if (!storedUser) {
    return false;
  }

  try {
    const user = JSON.parse(storedUser);

    return (
      normalizedEmail === user.email &&
      password === user.password
    );
  } catch {
    localStorage.removeItem(DEMO_USER_KEY);
    return false;
  }
}

/* -----------------------------------------
   Create session
----------------------------------------- */

export function createDemoSession(
  email = DEMO_USER.email
) {
  const normalizedEmail = email
    ?.trim()
    .toLowerCase();

  let user = DEMO_USER;

  /*
    If logging in with the permanent demo account,
    always use the permanent demo user.
  */

  if (normalizedEmail !== DEMO_USER.email) {
    const storedUser = localStorage.getItem(
      DEMO_USER_KEY
    );

    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);

        if (
          parsedUser?.email === normalizedEmail
        ) {
          user = parsedUser;
        }
      } catch {
        localStorage.removeItem(DEMO_USER_KEY);
      }
    }
  }

  const session = {
    authenticated: true,

    user: {
      email: user.email,
      fullName: user.fullName,
    },

    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(
    DEMO_SESSION_KEY,
    JSON.stringify(session)
  );

  window.dispatchEvent(
    new Event("demo-auth-change")
  );

  return session;
}

/* -----------------------------------------
   Get current session
----------------------------------------- */

export function getDemoSession() {
  const session = localStorage.getItem(
    DEMO_SESSION_KEY
  );

  if (!session) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(session);

    if (
      !parsedSession?.authenticated ||
      !parsedSession?.user
    ) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      return null;
    }

    return parsedSession;
  } catch {
    localStorage.removeItem(DEMO_SESSION_KEY);
    return null;
  }
}

/* -----------------------------------------
   Check authentication
----------------------------------------- */

export function isDemoAuthenticated() {
  return getDemoSession() !== null;
}

/* -----------------------------------------
   Sign out
----------------------------------------- */

export function signOutDemoUser() {
  localStorage.removeItem(DEMO_SESSION_KEY);

  window.dispatchEvent(
    new Event("demo-auth-change")
  );
}

/* -----------------------------------------
   Clear all demo/local authentication
----------------------------------------- */

export function clearDemoAuth() {
  localStorage.removeItem(DEMO_SESSION_KEY);
  localStorage.removeItem(DEMO_USER_KEY);

  window.dispatchEvent(
    new Event("demo-auth-change")
  );
}

/* -----------------------------------------
   Get permanent demo credentials
----------------------------------------- */

export function getDemoCredentials() {
  return {
    email: DEMO_USER.email,
    password: DEMO_USER.password,
  };
}