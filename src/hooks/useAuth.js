import { useEffect, useState } from "react";

import { getDemoSession } from "../services/demoAuth";

export default function useAuth() {
  const [session, setSession] = useState(() => {
    return getDemoSession();
  });

  useEffect(() => {
    const handleAuthChange = () => {
      setSession(getDemoSession());
    };

    window.addEventListener(
      "demo-auth-change",
      handleAuthChange
    );

    return () => {
      window.removeEventListener(
        "demo-auth-change",
        handleAuthChange
      );
    };
  }, []);

  return {
    user: session?.user ?? null,
    loading: false,
    isAuthenticated: !!session,
  };
}