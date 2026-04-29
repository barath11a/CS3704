import React, { useEffect, useState } from "react";
import { Routes, Route, Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import GroupView from "./pages/GroupView";
import Login from "./pages/Login";
import RemindersBanner from "./components/RemindersBanner";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "./services/api";

function NavAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loggedIn, setLoggedIn] = useState(
    () => !!localStorage.getItem(AUTH_TOKEN_KEY)
  );

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem(AUTH_TOKEN_KEY));
  }, [location.pathname]);

  useEffect(() => {
    const onStorage = () =>
      setLoggedIn(!!localStorage.getItem(AUTH_TOKEN_KEY));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setLoggedIn(false);
    window.dispatchEvent(new Event("iges-auth-change"));
    navigate("/");
  };

  return (
    <nav className="nav-links">
      <NavLink to="/">Dashboard</NavLink>
      {loggedIn ? (
        <button type="button" className="nav-cta" onClick={logout}>
          Log out
        </button>
      ) : (
        <NavLink to="/login" className="nav-cta">
          Sign in
        </NavLink>
      )}
    </nav>
  );
}

function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <Link to="/" className="brand">
            <span className="brand-mark">i</span>
            <span className="brand-name">IGES</span>
            <span className="brand-tag">expense splitter</span>
          </Link>
          <span className="nav-spacer" />
          <NavAuth />
        </div>
      </header>

      <main className="page">
        <RemindersBanner />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/groups/:groupId" element={<GroupView />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <span>IGES — Intelligent Group Expense Splitter</span>
          <span>Built by Team 4 · CS3704</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
