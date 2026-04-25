import React, { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import GroupView from "./pages/GroupView";
import Login from "./pages/Login";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "./services/api";

function readStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function NavAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loggedIn, setLoggedIn] = useState(() => !!localStorage.getItem(AUTH_TOKEN_KEY));
  const [user, setUser] = useState(readStoredUser);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem(AUTH_TOKEN_KEY));
    setUser(readStoredUser());
  }, [location.pathname]);

  useEffect(() => {
    const sync = () => {
      setLoggedIn(!!localStorage.getItem(AUTH_TOKEN_KEY));
      setUser(readStoredUser());
    };

    window.addEventListener("storage", sync);
    window.addEventListener("iges-auth-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("iges-auth-change", sync);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setLoggedIn(false);
    window.dispatchEvent(new Event("iges-auth-change"));
    navigate("/");
  };

  return (
    <div className="nav-auth">
      <Link className="button button-secondary" to="/">
        Home
      </Link>
      {loggedIn && user ? (
        <>
          <span className="session-box">{user.name}</span>
          <button className="button button-secondary" type="button" onClick={logout}>
            Log out
          </button>
        </>
      ) : (
        <>
          <Link className="button button-secondary" to="/login">
            Sign in
          </Link>
          <Link className="button button-primary" to="/login?mode=register">
            Sign up
          </Link>
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <div className="app-shell">
      <div className="container">
        <header className="site-header">
          <div className="site-brand">
            <Link className="brand-link" to="/">
              IGES
            </Link>
            <div>
              <h1 className="site-title">Intelligent Group Expense Splitter</h1>
              <p className="site-summary">Shared expenses made easy.</p>
            </div>
          </div>
          <nav className="top-nav" aria-label="Primary">
            <NavAuth />
          </nav>
        </header>
        <main className="route-shell">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/login" element={<Login />} />
            <Route path="/groups/:groupId" element={<GroupView />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
