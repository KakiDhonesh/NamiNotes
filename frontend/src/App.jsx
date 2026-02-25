import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { useAuth } from "./context/AuthContext";
import { auth } from "./services/firebase";
import { createUserIfNotExists } from "./hooks/useCreateUser";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import "./App.css";

function App() {
  const { user } = useAuth();
  const [view, setView] = useState("home");
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const accountLabel =
    user?.displayName || user?.email?.split("@")[0] || "Account";

  useEffect(() => {
    if (!user) return;
    createUserIfNotExists(user).catch(() => {});
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!user) return <Login />;

  return (
    <div className="app-root">
      <nav className="app-nav">
        <div className="nav-content">
          <div className="nav-brand">NamiNotes</div>
          <div className="nav-actions">
            <div className="nav-tabs">
              <button
                className={`nav-link ${view === "home" ? "active" : ""}`}
                onClick={() => setView("home")}
              >
                Home
              </button>
              <button
                className={`nav-link ${view === "dashboard" ? "active" : ""}`}
                onClick={() => setView("dashboard")}
              >
                Dashboard
              </button>
            </div>
            <div className="nav-account">
              <div className="account-dropdown">
                <button
                  className="nav-user-btn"
                  onClick={() => setShowAccountMenu((prev) => !prev)}
                >
                  {accountLabel}
                </button>
                {showAccountMenu && (
                  <div className="dropdown-menu">
                    <button className="dropdown-item danger" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
      <div className="page-wrap">{view === "home" ? <Home /> : <Dashboard />}</div>
    </div>
  );
}

export default App;
