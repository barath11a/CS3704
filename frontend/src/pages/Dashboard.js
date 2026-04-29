import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Landing from "./Landing";
import {
  groupApi,
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
} from "../services/api";

function readStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function initials(name) {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]).join("").toUpperCase();
}

function Dashboard() {
  const [user, setUser] = useState(readStoredUser);
  const [groups, setGroups] = useState([]);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      setGroups([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await groupApi.list();
      setGroups(data);
    } catch (err) {
      const msg =
        err.response?.data?.msg ||
        err.response?.data?.error ||
        err.message ||
        "Could not load groups.";
      setError(msg);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      setUser(readStoredUser());
      loadGroups();
    };
    sync();
    window.addEventListener("iges-auth-change", sync);
    return () => window.removeEventListener("iges-auth-change", sync);
  }, [loadGroups]);

  const createGroup = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError("");
    try {
      const { data } = await groupApi.create(name);
      setNewName("");
      setGroups((prev) => [data, ...prev]);
    } catch (err) {
      const msg =
        err.response?.data?.error || err.message || "Could not create group.";
      setError(msg);
    }
  };

  if (!user) {
    return <Landing />;
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <div className="section-eyebrow">Your account</div>
          <h1>Welcome back, {user.name?.split(" ")[0] || "friend"}.</h1>
          <p>Signed in as {user.email}</p>
        </div>
      </div>

      <form className="create-bar" onSubmit={createGroup}>
        <input
          id="new-group-name"
          aria-label="New group name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Name a new group — e.g. Spring break trip"
        />
        <button type="submit" className="btn btn-accent">
          + New group
        </button>
      </form>

      {error ? (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      ) : null}

      {loading && groups.length === 0 ? (
        <p className="subtle" style={{ marginTop: 18 }}>
          Loading your groups…
        </p>
      ) : null}

      {!loading && groups.length === 0 ? (
        <div className="empty">
          No groups yet. Create one above to start tracking shared expenses.
        </div>
      ) : (
        <div className="group-grid">
          {groups.map((g) => (
            <Link key={g.id} to={`/groups/${g.id}`} className="group-card">
              <div className="gc-row">
                <h3>{g.name}</h3>
                <span className="gc-mark">{initials(g.name)}</span>
              </div>
              <div className="gc-meta">
                {(g.members?.length || 0)} member
                {(g.members?.length || 0) === 1 ? "" : "s"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default Dashboard;
