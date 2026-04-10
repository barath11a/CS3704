import React, { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
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
    <>
      <Link to="/">Dashboard</Link>
      {" | "}
      {loggedIn ? (
        <button type="button" onClick={logout}>
          Log out
        </button>
      ) : (
        <Link to="/login">Login</Link>
      )}
    </>
  );
}

function App() {
  return (
    <div className="container">
      <header>
        <h1>Intelligent Group Expense Splitter</h1>
        <nav>
          <NavAuth />
        </nav>
      </header>
      <RemindersBanner />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/groups/:groupId" element={<GroupView />} />
      </Routes>
    </div>
  );
}

export default App;
