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

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function parseMemberNames(value) {
  if (!value.trim()) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function Dashboard() {
  const [user, setUser] = useState(readStoredUser);
  const [groups, setGroups] = useState([]);
  const [newName, setNewName] = useState("");
  const [memberNamesInput, setMemberNamesInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

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
    setCreating(true);
    try {
      const memberNames = parseMemberNames(memberNamesInput);
      const { data } = await groupApi.create(name, memberNames);
      setNewName("");
      setMemberNamesInput("");
      setGroups((prev) => [data, ...prev]);
    } catch (err) {
      const msg =
        err.response?.data?.error || err.message || "Could not create group.";
      setError(msg);
    } finally {
      setCreating(false);
    }
  };

  const totalMembers = groups.reduce(
    (sum, group) => sum + (group.members?.length || 0),
    0
  );

  if (!user) {
    return (
      <section className="page-grid">
        <div className="panel hero-card">
          <p className="eyebrow">Simple shared-expense tracking</p>
          <h2>Split group expenses without losing track of who paid.</h2>
          <p className="lead">
            IGES helps roommates, trips, dinners, and event groups keep one clear
            record of expenses, balances, and who still owes what.
          </p>
          <div className="landing-points">
            <span>Create groups</span>
            <span>Add expenses</span>
            <span>Track balances</span>
          </div>
          <div className="button-row">
            <Link className="button button-primary" to="/login?mode=register">
              Create account
            </Link>
            <Link className="button button-secondary" to="/login">
              Sign in
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-grid">
      <div className="panel">
        <div>
          <p className="eyebrow">Your groups</p>
          <h2>{`${user.name}'s Groups`}</h2>
          <p className="lead">Create a group or open an existing one.</p>
          <p className="muted-text">
            {pluralize(groups.length, "group")} total, {pluralize(totalMembers, "member")} across them.
          </p>
        </div>
      </div>

      <div className="panel form-card">
        <p className="eyebrow">New group</p>
        <h3>Create a new group</h3>
        <form className="auth-form" onSubmit={createGroup}>
          <label className="field">
            <span>Group name</span>
            <input
              id="new-group-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Spring break trip"
            />
          </label>
          <label className="field">
            <span>Members</span>
            <input
              value={memberNamesInput}
              onChange={(e) => setMemberNamesInput(e.target.value)}
              placeholder="Optional: Ronit, Barath, Harin"
            />
          </label>
          <button className="button button-primary" type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create group"}
          </button>
        </form>
        {error ? <p className="inline-error" role="alert">{error}</p> : null}
      </div>

      <div className="panel section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Group list</p>
            <h3>Open a group</h3>
          </div>
          {loading ? <p className="muted-text">Refreshing your groups…</p> : null}
        </div>
        {!loading && groups.length === 0 ? (
          <div className="empty-state">
            <h4>No groups yet</h4>
            <p>Create your first group above to start splitting expenses.</p>
          </div>
        ) : (
          <div className="group-grid">
            {groups.map((group) => (
              <article key={group.id} className="group-card">
                <div className="group-card-header">
                  <div>
                    <p className="group-kicker">
                      {group.owner_id === user.id ? "Owner" : "Member"}
                    </p>
                    <h4>{group.name}</h4>
                  </div>
                  <span className="group-id">#{group.id}</span>
                </div>
                <div className="group-meta">
                  <span>{pluralize(group.members?.length || 0, "member")}</span>
                  <span>{group.owner_id === user.id ? "Owned by you" : "Shared with you"}</span>
                </div>
                <Link className="button button-secondary" to={`/groups/${group.id}`}>
                  Open group
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Dashboard;
