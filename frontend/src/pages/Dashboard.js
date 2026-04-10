import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    return (
      <section>
        <h2>Your Groups</h2>
        <p>
          <Link to="/login">Sign in</Link> to see your groups and create new
          ones.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2>Your Groups</h2>
      <p>
        Signed in as {user.name} ({user.email})
      </p>
      <form onSubmit={createGroup}>
        <label htmlFor="new-group-name">New group name</label>
        <input
          id="new-group-name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. Spring break trip"
        />
        <button type="submit">+ New Group</button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      {loading && groups.length === 0 ? <p>Loading…</p> : null}
      {!loading && groups.length === 0 ? (
        <p>No groups yet. Create one above to start tracking shared expenses.</p>
      ) : (
        <ul>
          {groups.map((g) => (
            <li key={g.id}>
              <Link to={`/groups/${g.id}`}>{g.name}</Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default Dashboard;
