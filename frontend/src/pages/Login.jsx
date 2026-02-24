import { useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";

const provider = new GoogleAuthProvider();

export default function Login() {
  const [mode, setMode] = useState("signin");
  const [username, setUsername] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const getFriendlyErrorMessage = (error) => {
    const code = error?.code || "";

    if (code === "permission-denied") {
      return "Username login is not available until Firestore rules are updated. Please sign in with email for now.";
    }

    if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
      return "Invalid email/username or password.";
    }

    if (code === "auth/user-not-found") {
      return "No account found for these credentials.";
    }

    if (code === "auth/invalid-email") {
      return "Please enter a valid email address.";
    }

    if (code === "auth/too-many-requests") {
      return "Too many attempts. Please try again later.";
    }

    return error?.message || "Authentication failed";
  };

  const resolveEmailForSignIn = async (value) => {
    const trimmedValue = value.trim();
    if (trimmedValue.includes("@")) {
      return trimmedValue;
    }

    const usernameRef = doc(db, "usernames", trimmedValue.toLowerCase());
    const usernameSnap = await getDoc(usernameRef);

    if (!usernameSnap.exists()) {
      throw new Error("Username not found.");
    }

    const data = usernameSnap.data();
    if (!data?.email) {
      throw new Error("Username is not linked to an email.");
    }

    return data.email;
  };

  const handleLogin = async () => {
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err?.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setInfo("");

    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    if (mode === "signup") {
      if (!signupEmail.trim()) {
        setError("Email is required for sign up.");
        return;
      }

      if (!username.trim()) {
        setError("Username is required for sign up.");
        return;
      }

      if (!confirmPassword.trim()) {
        setError("Confirm password is required for sign up.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    } else if (!identifier.trim()) {
      setError("Email or username is required.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        const normalizedUsername = username.trim().toLowerCase();
        const usernameRef = doc(db, "usernames", normalizedUsername);
        const usernameSnap = await getDoc(usernameRef);

        if (usernameSnap.exists()) {
          throw new Error("Username is already taken.");
        }

        const userCredential = await createUserWithEmailAndPassword(
          auth,
          signupEmail.trim(),
          password
        );

        await updateProfile(userCredential.user, {
          displayName: username.trim(),
        });

        await setDoc(usernameRef, {
          uid: userCredential.user.uid,
          username: username.trim(),
          email: signupEmail.trim(),
          createdAt: serverTimestamp(),
        });
      } else {
        let emailToSignIn;
        try {
          emailToSignIn = await resolveEmailForSignIn(identifier);
        } catch (lookupError) {
          if (lookupError?.code === "permission-denied") {
            setError(
              "Username login is blocked by Firestore rules. Use email login, or deploy the latest Firestore rules first."
            );
            return;
          }
          throw lookupError;
        }

        await signInWithEmailAndPassword(auth, emailToSignIn, password);
      }
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setInfo("");

    const emailValue = identifier.trim();
    if (!emailValue || !emailValue.includes("@")) {
      setError("Enter your email in the field above to reset password.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, emailValue);
      setInfo("Password reset link sent to your email.");
    } catch (err) {
      setError(err?.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <p className="eyebrow">Movie update tracker</p>
        <h1>NamiNotes</h1>
        <p className="muted">
          {mode === "signin"
            ? "Sign in to start tracking production news, release windows, and where to watch your favorite titles."
            : "Create your account to track production news, release windows, and where to watch your favorite titles."}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input
              className="search-input"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          )}
          <input
            className="search-input"
            type={mode === "signup" ? "email" : "text"}
            placeholder={mode === "signup" ? "Email" : "Email or username"}
            value={mode === "signup" ? signupEmail : identifier}
            onChange={(e) => {
              if (mode === "signup") {
                setSignupEmail(e.target.value);
              } else {
                setIdentifier(e.target.value);
              }
            }}
          />
          <div className="password-field">
            <input
              className="search-input"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M3.3 2.3 2 3.6l4 4A11.2 11.2 0 0 0 1.5 12 11.8 11.8 0 0 0 12 18.5c1.9 0 3.6-.4 5.1-1.1l3.3 3.3 1.3-1.3L3.3 2.3zm8.7 13.2A3.5 3.5 0 0 1 8.5 12c0-.4.1-.9.2-1.2l4.5 4.5c-.4.1-.8.2-1.2.2zm9.9-3.5A11.8 11.8 0 0 0 12 5.5c-1.5 0-3 .3-4.3.8l1.6 1.6c.8-.3 1.7-.4 2.7-.4A10 10 0 0 1 19.7 12a10.4 10.4 0 0 1-2 2.4l1.4 1.4a12.2 12.2 0 0 0 2.8-3.8z"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M12 5.5A11.8 11.8 0 0 0 1.5 12 11.8 11.8 0 0 0 12 18.5 11.8 11.8 0 0 0 22.5 12 11.8 11.8 0 0 0 12 5.5zm0 11A4.5 4.5 0 1 1 16.5 12 4.5 4.5 0 0 1 12 16.5zm0-7A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5z"
                  />
                </svg>
              )}
            </button>
          </div>
          {mode === "signup" && (
            <input
              className="search-input"
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}

          {error && <p className="error-text">{error}</p>}
          {info && <p className="info-text">{info}</p>}

          <button className="primary" type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        {mode === "signin" ? (
          <div className="auth-links">
            <button
              type="button"
              className="auth-link"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Forgot Password?
            </button>
            <button
              type="button"
              className="auth-link"
              onClick={() => {
                setMode("signup");
                setError("");
                setInfo("");
              }}
              disabled={loading}
            >
              Sign Up
            </button>
          </div>
        ) : (
          <div className="auth-links">
            <span className="tiny">Already have an account?</span>
            <button
              type="button"
              className="auth-link"
              onClick={() => {
                setMode("signin");
                setError("");
                setInfo("");
              }}
              disabled={loading}
            >
              Sign In
            </button>
          </div>
        )}

        <p className="tiny auth-divider">or you can sign in with</p>

        <div className="google-action">
          <button
            type="button"
            className="google-icon-btn"
            onClick={handleLogin}
            disabled={loading}
            aria-label="Sign in with Google"
            title="Sign in with Google"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.6 3.6 14.5 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12s4.1 9.3 9.2 9.3c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1-.1-1.5H12z"
              />
              <path
                fill="#34A853"
                d="M2.8 7.1l3.2 2.3C6.8 7.5 9.2 6 12 6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.6 3.6 14.5 2.7 12 2.7 8.5 2.7 5.4 4.6 3.7 7.5l-.9-.4z"
              />
              <path
                fill="#FBBC05"
                d="M12 21.3c2.4 0 4.4-.8 5.9-2.2l-2.7-2.2c-.8.5-1.8.9-3.2.9-2.8 0-5.2-1.9-6.1-4.4l-3.1 2.4c1.8 3.3 5.2 5.5 9.2 5.5z"
              />
              <path
                fill="#4285F4"
                d="M20.8 12.4c0-.6-.1-1-.1-1.5H12v3.9h5.4c-.3 1.1-1.1 2-2.1 2.7l2.7 2.2c1.6-1.5 2.8-3.9 2.8-7.3z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
