import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const Login = () => {
  const googleButtonRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loginWithGoogleCredential, authLoading } = useAuth();
  const [error, setError] = useState("");

  const redirectTo = location?.state?.from?.pathname || "/";

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  useEffect(() => {
    let cancelled = false;

    const initializeGoogleLogin = () => {
      if (cancelled) return;

      if (!GOOGLE_CLIENT_ID) {
        setError("Missing VITE_GOOGLE_CLIENT_ID. Please configure Google Client ID in frontend environment.");
        return;
      }

      if (!window.google?.accounts?.id || !googleButtonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            setError("");
            await loginWithGoogleCredential(response.credential);
            navigate(redirectTo, { replace: true });
          } catch (loginError) {
            console.error("Google login failed", loginError);
            setError(loginError?.message || "Google login failed");
          }
        },
      });

      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "signin_with",
        shape: "rectangular",
      });
    };

    if (window.google?.accounts?.id) {
      initializeGoogleLogin();
      return () => {
        cancelled = true;
      };
    }

    const scriptId = "google-identity-services-script";
    let script = document.getElementById(scriptId);

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleLogin;
      document.body.appendChild(script);
    } else {
      script.addEventListener("load", initializeGoogleLogin);
    }

    return () => {
      cancelled = true;
      script?.removeEventListener?.("load", initializeGoogleLogin);
    };
  }, [loginWithGoogleCredential, navigate, redirectTo]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logoCircle}>BOM</div>
        <h1 style={styles.title}>Planning BOM</h1>
        <p style={styles.subtitle}>Sign in with Google to continue to Dashboard.</p>

        <div style={styles.googleButtonWrap}>
          <div ref={googleButtonRef} />
        </div>

        {authLoading ? <div style={styles.info}>Signing in...</div> : null}
        {error ? <div style={styles.error}>{error}</div> : null}
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eff6ff 0%, #f8fafc 45%, #eef2ff 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "34px 30px",
    boxShadow: "0 20px 45px rgba(15, 23, 42, 0.12)",
    textAlign: "center",
  },
  logoCircle: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: 800,
    letterSpacing: "0.5px",
    marginBottom: "18px",
  },
  title: {
    margin: 0,
    color: "#111827",
    fontSize: "28px",
    fontWeight: 700,
  },
  subtitle: {
    margin: "10px 0 26px",
    color: "#6b7280",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  googleButtonWrap: {
    display: "flex",
    justifyContent: "center",
    minHeight: "44px",
  },
  info: {
    marginTop: "16px",
    color: "#2563eb",
    fontSize: "13px",
    fontWeight: 600,
  },
  error: {
    marginTop: "16px",
    padding: "10px 12px",
    borderRadius: "6px",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: "13px",
    fontWeight: 600,
  },
};

export default Login;
