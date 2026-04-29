import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, AUTH_TOKEN_KEY, AUTH_USER_KEY } from "../services/api";

function Login() {
  const navigate = useNavigate();
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
    <section className="auth-wrap">
      <div className="auth-card">
        <div className="section-eyebrow">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </div>
        <h1>{mode === "login" ? "Sign in to IGES" : "Start splitting smarter"}</h1>
        <p className="auth-mode-switch">
          {mode === "login" ? (
            <>
              No account?{" "}
              <button
                type="button"
                className="btn-link"
                onClick={() => setMode("register")}
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                className="btn-link"
                onClick={() => setMode("login")}
              >
                Sign in
              </button>
            </>
          )}
        </p>

        <form onSubmit={onSubmit}>
          {mode === "register" && (
            <div className="field">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Maya Chen"
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@school.edu"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              placeholder="••••••••"
              required
            />
          </div>

          {error ? (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            className="btn btn-accent"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
          >
            {loading
              ? "Please wait…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </div>

      <aside className="auth-side">
        <div>
          <span className="hero-eyebrow" style={{ background: "rgba(110, 231, 183, 0.14)", color: "#6ee7b7" }}>
            Why IGES
          </span>
          <h2 style={{ marginTop: 14 }}>
            Track every cent, send every nudge — without the awkwardness.
          </h2>
          <p>
            Built for roommates who never quite settle, trips where everyone
            picks up a tab, and dinners that turn into receipt math.
          </p>
        </div>
        <div className="auth-quote">
          “Our beach house had four payers, three split methods, and exactly
          zero spreadsheets. IGES did it all.”
          <div className="who">— Pilot user, Spring 2026</div>
        </div>
      </aside>
    </section>
  );
}

export default Login;
