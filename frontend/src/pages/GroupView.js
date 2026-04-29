import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  expenseApi,
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

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const CATEGORY_GLYPH = {
  food: "🍴",
  transport: "🚖",
  lodging: "🏠",
  groceries: "🛒",
  uncategorized: "·",
};

function categoryGlyph(category) {
  return CATEGORY_GLYPH[category] || CATEGORY_GLYPH.uncategorized;
}

function avatarTone(idx) {
  return ["", "alt-1", "alt-2", "alt-3"][idx % 4];
}

function memberInitial(memberId, currentUser) {
  if (currentUser && memberId === currentUser.id && currentUser.name) {
    const parts = currentUser.name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]).join("").toUpperCase();
  }
  return `M${memberId}`.slice(0, 2);
}

function GroupView() {
  const { groupId } = useParams();
  const [user, setUser] = useState(readStoredUser);
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // add-expense form state
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // OCR state
  const fileRef = useRef(null);
  const [scanStatus, setScanStatus] = useState(""); // '', 'scanning', 'ok', 'empty', 'error'
  const [scanMessage, setScanMessage] = useState("");

  // invite state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState(""); // '', 'sending', 'ok', 'error'
  const [inviteMessage, setInviteMessage] = useState("");

  useEffect(() => {
    const syncUser = () => setUser(readStoredUser());
    window.addEventListener("iges-auth-change", syncUser);
    window.addEventListener("storage", syncUser);
    return () => {
      window.removeEventListener("iges-auth-change", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [groupResponse, expensesResponse] = await Promise.all([
          groupApi.get(groupId),
          expenseApi.listForGroup(groupId),
        ]);
        if (cancelled) return;
        setGroup(groupResponse.data);
        setExpenses(expensesResponse.data);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err.response?.data?.msg ||
          err.response?.data?.error ||
          err.message ||
          "Could not load this group.";
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const netBalance = useMemo(() => {
    if (!user) return 0;
    return expenses.reduce((total, expense) => {
      const paid = expense.payer_id === user.id ? Number(expense.amount) : 0;
      const owed =
        expense.shares?.reduce((sum, share) => {
          if (share.user_id !== user.id) return sum;
          return sum + Number(share.amount_owed || 0);
        }, 0) || 0;
      return total + paid - owed;
    }, 0);
  }, [expenses, user]);

  const totalSpent = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount || 0), 0),
    [expenses]
  );

  const balanceTone =
    netBalance > 0.005 ? "pos" : netBalance < -0.005 ? "neg" : "zero";
  const balanceLabel =
    balanceTone === "pos"
      ? "You are owed"
      : balanceTone === "neg"
        ? "You owe"
        : "Settled up";

  const onPickReceipt = () => fileRef.current?.click();

  const onReceiptChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanStatus("scanning");
    setScanMessage("Reading receipt…");
    try {
      const { data } = await expenseApi.scanReceipt(file);
      const total = data?.detected_total;
      if (typeof total === "number" && !Number.isNaN(total)) {
        setFormAmount(total.toFixed(2));
        setScanStatus("ok");
        setScanMessage(`Detected total: ${formatCurrency(total)}`);
      } else {
        setScanStatus("empty");
        setScanMessage(
          "Couldn't find a total on that receipt — enter it manually."
        );
      }
    } catch (err) {
      setScanStatus("error");
      setScanMessage(
        err.response?.data?.error ||
          err.message ||
          "Receipt scan failed. Try a clearer photo."
      );
    } finally {
      // reset so the same file can be re-picked
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onInvite = async (e) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInviteStatus("sending");
    setInviteMessage("");
    try {
      const { data } = await groupApi.inviteByEmail(groupId, email);
      const name = data?.user?.name || email;
      setInviteStatus("ok");
      setInviteMessage(`${name} added to the group.`);
      setInviteEmail("");
      const groupResp = await groupApi.get(groupId);
      setGroup(groupResp.data);
    } catch (err) {
      setInviteStatus("error");
      const status = err.response?.status;
      const apiMsg = err.response?.data?.error;
      setInviteMessage(
        status === 404
          ? "No user with that email — they need to register first."
          : status === 409
            ? "That user is already in the group."
            : apiMsg || err.message || "Could not add member."
      );
    }
  };

  const onAddExpense = async (e) => {
    e.preventDefault();
    setFormError("");
    const description = formDesc.trim();
    const amount = parseFloat(formAmount);
    if (!description) {
      setFormError("Add a short description.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError("Enter an amount greater than zero.");
      return;
    }
    if (!user || !group) return;
    const participants =
      group.members && group.members.length > 0
        ? group.members
        : [user.id];

    setSubmitting(true);
    try {
      await expenseApi.add({
        group_id: Number(groupId),
        payer_id: user.id,
        description,
        amount,
        split_method: "equal",
        participants,
      });
      setFormDesc("");
      setFormAmount("");
      setScanStatus("");
      setScanMessage("");
      // refresh
      const { data } = await expenseApi.listForGroup(groupId);
      setExpenses(data);
    } catch (err) {
      setFormError(
        err.response?.data?.error || err.message || "Could not add expense."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!localStorage.getItem(AUTH_TOKEN_KEY) || !user) {
    return (
      <section className="empty">
        Sign in to view your balance for this group.
        <div style={{ marginTop: 12 }}>
          <Link to="/login" className="btn btn-accent">
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  if (loading) {
    return <p className="subtle">Loading group details…</p>;
  }

  if (error) {
    return (
      <div className="alert alert-error" role="alert">
        {error}
      </div>
    );
  }

  const memberIds = group?.members || [];

  return (
    <section className="group-page">
      <div>
        <div className="balance-hero">
          <div className="crumb">
            <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>
              Dashboard
            </Link>{" "}
            <span style={{ opacity: 0.5 }}>›</span> Group
          </div>
          <h1>{group?.name || `Group ${groupId}`}</h1>
          <div className="balance-meta">
            <span>{memberIds.length} member{memberIds.length === 1 ? "" : "s"}</span>
            <span>·</span>
            <span>{expenses.length} expense{expenses.length === 1 ? "" : "s"}</span>
            <span>·</span>
            <span>{formatCurrency(totalSpent)} tracked</span>
          </div>

          <div className="balance-figure">
            <div>
              <div className="label">{balanceLabel}</div>
              <div className={`value ${balanceTone}`}>
                {formatCurrency(Math.abs(netBalance))}
              </div>
            </div>
          </div>

          <p className="balance-foot">
            Your net balance is what you&apos;ve paid for the group, minus your
            shares of every expense. Positive means the group owes you; negative
            means you owe the group.
          </p>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Recent activity</h2>
            <span className="count">{expenses.length}</span>
          </div>
          {expenses.length === 0 ? (
            <p className="subtle">
              No expenses yet. Add one on the right to start tracking.
            </p>
          ) : (
            <ul className="expense-list">
              {expenses
                .slice()
                .reverse()
                .map((e) => {
                  const isYou = e.payer_id === user.id;
                  return (
                    <li key={e.id} className="expense-row">
                      <div className="expense-icon" aria-hidden>
                        {categoryGlyph(e.category)}
                      </div>
                      <div>
                        <div className="desc">{e.description}</div>
                        <div className="meta">
                          {isYou ? "You paid" : `Paid by member #${e.payer_id}`}
                          {" · "}
                          {e.split_method} split
                          {e.category && e.category !== "uncategorized"
                            ? ` · ${e.category}`
                            : ""}
                        </div>
                      </div>
                      <div className="amount-col">
                        <div className="amount">{formatCurrency(e.amount)}</div>
                        <div className="meta">
                          {e.shares?.length
                            ? `${e.shares.length} ways`
                            : "—"}
                        </div>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </div>

      <aside>
        <div className="panel">
          <div className="panel-head">
            <h2>Members</h2>
            <span className="count">{memberIds.length}</span>
          </div>
          <div className="member-list">
            {memberIds.length === 0 ? (
              <p className="subtle">No members yet.</p>
            ) : (
              memberIds.map((mid, idx) => (
                <span key={mid} className="chip">
                  <span className={`avatar ${avatarTone(idx)}`}>
                    {memberInitial(mid, user)}
                  </span>
                  {mid === user.id ? user.name || "You" : `Member #${mid}`}
                </span>
              ))
            )}
          </div>

          <div className="divider" />

          <form onSubmit={onInvite}>
            <div className="field">
              <label htmlFor="invite-email">Invite by email</label>
              <input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(ev) => setInviteEmail(ev.target.value)}
                placeholder="friend@school.edu"
              />
            </div>
            {inviteMessage ? (
              <p
                className="subtle"
                style={{
                  fontSize: "0.82rem",
                  color:
                    inviteStatus === "ok"
                      ? "var(--accent-2)"
                      : inviteStatus === "error"
                        ? "var(--danger)"
                        : "var(--muted)",
                  marginTop: -4,
                  marginBottom: 12,
                }}
              >
                {inviteMessage}
              </p>
            ) : null}
            <button
              type="submit"
              className="btn btn-ghost"
              disabled={inviteStatus === "sending" || !inviteEmail.trim()}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {inviteStatus === "sending" ? "Adding…" : "Add to group"}
            </button>
            <p
              className="subtle"
              style={{ fontSize: "0.78rem", marginTop: 10 }}
            >
              They&apos;ll need to have registered with that email already.
            </p>
          </form>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Add expense</h2>
          </div>
          <form onSubmit={onAddExpense}>
            <div className="field">
              <label htmlFor="ex-desc">Description</label>
              <input
                id="ex-desc"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="e.g. Sushi at Komodo"
              />
            </div>

            <div className="row-2">
              <div className="field">
                <label htmlFor="ex-amount">Amount</label>
                <input
                  id="ex-amount"
                  inputMode="decimal"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="field">
                <label>From receipt</label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onPickReceipt}
                  disabled={scanStatus === "scanning"}
                  style={{ justifyContent: "center" }}
                >
                  {scanStatus === "scanning" ? "Scanning…" : "Scan receipt"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={onReceiptChange}
                  style={{ display: "none" }}
                />
              </div>
            </div>

            {scanMessage ? (
              <p
                className="subtle"
                style={{
                  fontSize: "0.82rem",
                  color:
                    scanStatus === "ok"
                      ? "var(--accent-2)"
                      : scanStatus === "error"
                        ? "var(--danger)"
                        : "var(--muted)",
                  marginTop: -4,
                  marginBottom: 12,
                }}
              >
                {scanMessage}
              </p>
            ) : null}

            {formError ? (
              <div
                className="alert alert-error"
                role="alert"
                style={{ marginTop: 0, marginBottom: 12 }}
              >
                {formError}
              </div>
            ) : null}

            <button
              type="submit"
              className="btn btn-accent"
              disabled={submitting}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {submitting ? "Adding…" : "Add expense"}
            </button>
            <p
              className="subtle"
              style={{ fontSize: "0.78rem", marginTop: 10 }}
            >
              Splits equally among all {memberIds.length || 1} member
              {memberIds.length === 1 ? "" : "s"}.
            </p>
          </form>
        </div>
      </aside>
    </section>
  );
}

export default GroupView;
