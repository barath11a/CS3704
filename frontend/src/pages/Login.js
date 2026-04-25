import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authApi, AUTH_TOKEN_KEY, AUTH_USER_KEY } from "../services/api";

function Login() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const persistSession = (user, token) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event("iges-auth-change"));
  };

  useEffect(() => {
    const requestedMode = searchParams.get("mode");
    setMode(requestedMode === "register" ? "register" : "login");
  }, [searchParams]);

  const switchMode = (nextMode) => {
    setSearchParams(nextMode === "register" ? { mode: "register" } : {});
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (mode === "register" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "register") {
        const { data } = await authApi.register(name, email, password);
        persistSession(data.user, data.token);
      } else {
        const { data } = await authApi.login(email, password);
        persistSession(data.user, data.token);
      }
      navigate("/");
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        "Something went wrong. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-grid">
      <div className="panel login-simple">
        <p className="eyebrow">Account</p>
        <h2>{mode === "login" ? "Sign in" : "Create account"}</h2>
        <p className="muted-text">
          {mode === "login"
            ? "Use your email and password."
            : "Create an account to get started."}
        </p>
        <div className="login-toggle">
          <button
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            type="button"
            onClick={() => switchMode("login")}
          >
            Sign in
          </button>
          <button
            className={`auth-tab ${mode === "register" ? "active" : ""}`}
            type="button"
            onClick={() => switchMode("register")}
          >
            Register
          </button>
        </div>
        <form className="auth-form" onSubmit={onSubmit}>
          {mode === "register" && (
            <label className="field">
              <span>Name</span>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Amanjeet"
              />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              placeholder="Enter your password"
              required
            />
          </label>
          {error ? <p className="inline-error" role="alert">{error}</p> : null}
          <button className="button button-primary" type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default Login;
