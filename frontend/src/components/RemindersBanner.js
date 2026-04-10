import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AUTH_TOKEN_KEY, reminderApi } from "../services/api";

const DISMISS_KEY = "iges_reminder_dismissed";

function readDismissed() {
  try {
    const raw = sessionStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function RemindersBanner() {
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [dismissed, setDismissed] = useState(() => readDismissed());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const tokenPresent = !!localStorage.getItem(AUTH_TOKEN_KEY);

  const persistDismissed = useCallback((next) => {
    sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...next]));
    setDismissed(next);
  }, []);

  const dismissOne = (key) => {
    const next = new Set(dismissed);
    next.add(key);
    persistDismissed(next);
  };

  const load = useCallback(async () => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await reminderApi.list();
      setItems(data.items || []);
    } catch (err) {
      const msg =
        err.response?.data?.msg ||
        err.response?.data?.error ||
        err.message ||
        "";
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, location.pathname]);

  useEffect(() => {
    const onAuth = () => load();
    window.addEventListener("iges-auth-change", onAuth);
    return () => window.removeEventListener("iges-auth-change", onAuth);
  }, [load]);

  const visible = useMemo(() => {
    return items.filter((r) => !dismissed.has(`${r.group_id}:${r.kind}`));
  }, [items, dismissed]);

  if (!tokenPresent) return null;

  if (error && visible.length === 0 && !loading) {
    return null;
  }

  if (visible.length === 0 && !loading) {
    return null;
  }

  return (
    <aside className="reminders-banner" aria-label="Balance reminders">
      <h2 className="reminders-heading">Reminders</h2>
      <p className="reminders-sub">
        Friendly nudges based on your current balances in each group.
      </p>
      {loading && visible.length === 0 ? (
        <p className="reminders-muted">Loading reminders…</p>
      ) : null}
      <ul className="reminders-list">
        {visible.map((r) => {
          const dkey = `${r.group_id}:${r.kind}`;
          const kindClass =
            r.kind === "you_owe" ? "reminder-owe" : "reminder-credit";
          return (
            <li key={dkey} className={`reminder-card ${kindClass}`}>
              <p className="reminder-message">{r.message}</p>
              <div className="reminder-actions">
                <Link to={`/groups/${r.group_id}`}>Open group</Link>
                <button type="button" onClick={() => dismissOne(dkey)}>
                  Dismiss
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

export default RemindersBanner;
