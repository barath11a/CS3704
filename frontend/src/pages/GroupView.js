import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  }).format(Number(amount) || 0);
}

function memberNameMap(group, user) {
  const map = new Map();
  (group?.member_details || []).forEach((member) => {
    map.set(member.id, member.id === user?.id ? "You" : member.name);
  });
  return map;
}

function describeMember(memberId, names) {
  return names.get(memberId) || `Member ${memberId}`;
}

function parseMemberNames(value) {
  if (!value.trim()) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function GroupView() {
  const { groupId } = useParams();
  const numericGroupId = Number(groupId);
  const [user, setUser] = useState(readStoredUser);
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [memberNamesInput, setMemberNamesInput] = useState("");
  const [memberError, setMemberError] = useState("");
  const [memberSuccess, setMemberSuccess] = useState("");
  const [addingMembers, setAddingMembers] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [participants, setParticipants] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const syncUser = () => setUser(readStoredUser());
    window.addEventListener("iges-auth-change", syncUser);
    window.addEventListener("storage", syncUser);

    return () => {
      window.removeEventListener("iges-auth-change", syncUser);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  const loadGroupData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [groupResponse, expensesResponse] = await Promise.all([
        groupApi.get(numericGroupId),
        expenseApi.listForGroup(numericGroupId),
      ]);
      setGroup(groupResponse.data);
      setExpenses(expensesResponse.data || []);
    } catch (err) {
      const msg =
        err.response?.data?.msg ||
        err.response?.data?.error ||
        err.message ||
        "Could not load this group.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [numericGroupId]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  useEffect(() => {
    if (!group?.members?.length) return;

    setParticipants((prev) => {
      if (prev.length > 0) {
        const filtered = prev.filter((memberId) => group.members.includes(memberId));
        return filtered.length > 0 ? filtered : [...group.members];
      }
      return [...group.members];
    });
  }, [group]);

  const sortedExpenses = useMemo(
    () => [...expenses].sort((a, b) => b.id - a.id),
    [expenses]
  );

  const memberIds = group?.members || [];
  const memberNames = useMemo(() => memberNameMap(group, user), [group, user]);

  const toggleParticipant = (memberId) => {
    setParticipants((prev) =>
      prev.includes(memberId)
        ? prev.filter((currentId) => currentId !== memberId)
        : [...prev, memberId]
    );
  };

  const resetComposer = () => {
    setDescription("");
    setAmount("");
    setFormError("");
    setParticipants([...memberIds]);
  };

  const buildPayload = () => {
    const trimmedDescription = description.trim();
    const numericAmountValue = Number(amount);

    if (!trimmedDescription) {
      throw new Error("Enter a description for the expense.");
    }
    if (!Number.isFinite(numericAmountValue) || numericAmountValue <= 0) {
      throw new Error("Enter a valid amount greater than zero.");
    }
    if (!participants.length) {
      throw new Error("Choose at least one participant.");
    }

    const payload = {
      group_id: numericGroupId,
      payer_id: user.id,
      description: trimmedDescription,
      amount: Number(numericAmountValue.toFixed(2)),
      split_method: "equal",
      participants,
    };

    return payload;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    try {
      const payload = buildPayload();
      setSubmitting(true);
      const { data } = await expenseApi.add(payload);
      setExpenses((prev) => [data, ...prev.filter((expense) => expense.id !== data.id)]);
      resetComposer();
    } catch (err) {
      setFormError(
        err.response?.data?.error ||
          err.message ||
          "Could not add this expense."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onAddMembers = async (e) => {
    e.preventDefault();
    setMemberError("");
    setMemberSuccess("");
    try {
      const names = parseMemberNames(memberNamesInput);
      if (!names.length) {
        throw new Error("Enter at least one member name.");
      }
      setAddingMembers(true);
      const { data } = await groupApi.addMembers(numericGroupId, names);
      const addedIds = data.added_user_ids || [];
      await loadGroupData();
      setMemberNamesInput("");
      setMemberSuccess(
        addedIds.length ? "Members added." : "Those users were already in the group."
      );
    } catch (err) {
      setMemberError(
        err.response?.data?.error ||
          err.message ||
          "Could not add members."
      );
    } finally {
      setAddingMembers(false);
    }
  };

  if (!localStorage.getItem(AUTH_TOKEN_KEY) || !user) {
    return (
      <section className="page-grid">
        <div className="panel empty-state">
          <h2>Sign in required</h2>
          <p>You need to sign in before viewing balances and expenses for this group.</p>
          <Link className="button button-primary" to="/login">
            Go to sign in
          </Link>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="page-grid">
        <div className="panel empty-state">
          <h2>Loading group details</h2>
          <p>Fetching balances, members, and expenses for group {groupId}.</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="page-grid">
        <div className="panel empty-state">
          <h2>Group unavailable</h2>
          <p role="alert">{error}</p>
          <button className="button button-secondary" type="button" onClick={loadGroupData}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="page-grid page-grid-group">
      <div className="panel">
        <div>
          <Link className="back-link" to="/">
            ← Back to dashboard
          </Link>
          <p className="eyebrow">Group</p>
          <h2>{group?.name || `Group ${groupId}`}</h2>
          <p className="lead">{memberIds.length} members • {sortedExpenses.length} expenses</p>
        </div>
      </div>

      <div className="panel section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Members</p>
            <h3>Current members</h3>
          </div>
        </div>
        <div className="member-list">
          {memberIds.map((memberId) => (
            <span className="member-chip" key={memberId}>
              {describeMember(memberId, memberNames)}
            </span>
          ))}
        </div>
        <form className="auth-form member-form" onSubmit={onAddMembers}>
          <label className="field">
            <span>Add members</span>
            <input
              value={memberNamesInput}
              onChange={(e) => setMemberNamesInput(e.target.value)}
              placeholder="e.g. Ronit, Barath, Harin"
            />
          </label>
          <button className="button button-secondary" type="submit" disabled={addingMembers}>
            {addingMembers ? "Adding…" : "Add members"}
          </button>
        </form>
        {memberError ? <p className="inline-error" role="alert">{memberError}</p> : null}
        {memberSuccess ? <p className="inline-success">{memberSuccess}</p> : null}
      </div>

      <div className="panel form-card">
        <p className="eyebrow">Add expense</p>
        <h3>Add a new expense</h3>
        <form className="expense-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <label className="field">
              <span>Description</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dinner, groceries, rideshare, tickets..."
                required
              />
            </label>
            <label className="field">
              <span>Amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </label>
          </div>

          <div className="field">
            <span>Participants</span>
            <div className="participant-grid">
              {memberIds.map((memberId) => (
                <label className="participant-option" key={memberId}>
                  <input
                    type="checkbox"
                    checked={participants.includes(memberId)}
                    onChange={() => toggleParticipant(memberId)}
                  />
                  <span>{describeMember(memberId, memberNames)}</span>
                </label>
              ))}
            </div>
          </div>

          {formError ? <p className="inline-error" role="alert">{formError}</p> : null}

          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? "Adding expense…" : "Add expense"}
          </button>
        </form>
      </div>

      <div className="panel section-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Expenses</p>
            <h3>Expense list</h3>
          </div>
          <button className="button button-secondary" type="button" onClick={loadGroupData}>
            Refresh
          </button>
        </div>
        {sortedExpenses.length === 0 ? (
          <div className="empty-state">
            <h4>No expenses yet</h4>
            <p>Add the first expense above to start calculating balances for this group.</p>
          </div>
        ) : (
          <div className="expense-list">
            {sortedExpenses.map((expense) => {
              const yourExpenseShare =
                expense.shares?.reduce((sum, share) => {
                  if (share.user_id !== user.id) return sum;
                  return sum + Number(share.amount_owed || 0);
                }, 0) || 0;

              return (
                <article className="expense-card" key={expense.id}>
                  <div className="expense-header">
                    <div>
                      <h4>{expense.description}</h4>
                      <p className="group-kicker">Expense #{expense.id}</p>
                    </div>
                    <strong>{formatCurrency(expense.amount)}</strong>
                  </div>
                  <div className="expense-meta">
                    <span>Paid by {describeMember(expense.payer_id, memberNames)}</span>
                    <span>{expense.shares?.length || 0} participants</span>
                    <span>Your share: {formatCurrency(yourExpenseShare)}</span>
                  </div>
                  <div className="share-pill-list">
                    {(expense.shares || []).map((share) => (
                      <span className="share-pill" key={`${expense.id}-${share.user_id}`}>
                        {describeMember(share.user_id, memberNames)}: {formatCurrency(share.amount_owed)}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default GroupView;
