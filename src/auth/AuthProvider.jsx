import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AUTH_STORAGE_KEY = "planning_bom_google_auth";

const AuthContext = createContext(null);

const getStoredAuth = () => {
  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.error("Failed to read stored auth", error);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [authUser, setAuthUser] = useState(() => getStoredAuth());
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (authUser) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [authUser]);

  const loginWithGoogleCredential = async (credential) => {
    setAuthLoading(true);

    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ credential }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || payload?.success === false) {
        throw new Error(
          payload?.message ||
            payload?.error ||
            payload?.details ||
            "Google login failed"
        );
      }

      const nextUser = {
        user: payload.user,
        token: payload.token || credential,
        loggedInAt: new Date().toISOString(),
      };

      setAuthUser(nextUser);
      return nextUser;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    setAuthUser(null);
  };

  const value = useMemo(
    () => ({
      authUser,
      user: authUser?.user || null,
      token: authUser?.token || "",
      isAuthenticated: !!authUser?.user,
      authLoading,
      loginWithGoogleCredential,
      logout,
    }),
    [authUser, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};

export default AuthProvider;