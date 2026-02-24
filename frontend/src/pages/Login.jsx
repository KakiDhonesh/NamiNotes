import { useState } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        const emailToSignIn = await resolveEmailForSignIn(identifier);
        await signInWithEmailAndPassword(auth, emailToSignIn, password);
      }
    } catch (err) {
      setError(err?.message || "Authentication failed");
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
          Sign in to start tracking production news, release windows, and where
          to watch your favorite titles.
        </p>

        <div className="auth-switch">
          <button
            type="button"
            className={mode === "signin" ? "chip active" : "chip"}
            onClick={() => setMode("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "signup" ? "chip active" : "chip"}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>

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
          <input
            className="search-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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

          <button className="primary" type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <button className="ghost" onClick={handleLogin} disabled={loading}>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
