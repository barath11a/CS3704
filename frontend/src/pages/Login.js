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
    <section>
      <h2>{mode === "login" ? "Login" : "Create account"}</h2>
      <p>
        {mode === "login" ? (
          <>
            No account?{" "}
            <button type="button" onClick={() => setMode("register")}>
              Register
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button type="button" onClick={() => setMode("login")}>
              Sign in
            </button>
          </>
        )}
      </p>
      <form onSubmit={onSubmit}>
        {mode === "register" && (
          <div>
            <label htmlFor="name">Name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
        )}
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
          />
        </div>
        {error ? <p role="alert">{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Register"}
        </button>
      </form>
    </section>
  );
}

export default Login;
