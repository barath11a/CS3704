import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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

function formatCategoryLabel(category) {
  if (!category || category === "uncategorized") return "Uncategorized";
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function GroupView() {
  const { groupId } = useParams();
  const [user, setUser] = useState(readStoredUser);
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

    async function loadGroupData() {
      setLoading(true);
      setError("");
      try {
        const requests = [groupApi.get(groupId), expenseApi.listForGroup(groupId)];
        const [groupResponse, expensesResponse] = await Promise.all(requests);

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
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGroupData();

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

  const balanceLabel =
    netBalance > 0
      ? "You are owed"
      : netBalance < 0
        ? "You owe"
        : "You are settled up";

  const absoluteBalance = Math.abs(netBalance);

  if (!localStorage.getItem(AUTH_TOKEN_KEY) || !user) {
    return (
      <section>
        <h2>Group {groupId}</h2>
        <p>Sign in to view your balance for this group.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <section>
        <h2>Group {groupId}</h2>
        <p>Loading group details…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section>
        <h2>Group {groupId}</h2>
        <p role="alert">{error}</p>
      </section>
    );
  }

  return (
    <section>
      <h2>{group?.name || `Group ${groupId}`}</h2>
      <p>
        Members: {group?.members?.length || 0} | Expenses: {expenses.length}
      </p>
      <div>
        <h3>Net Balance</h3>
        <p>{balanceLabel}</p>
        <p>{formatCurrency(absoluteBalance)}</p>
      </div>
      <p>
        Net balance is calculated as what you paid for the group minus your
        shares of all group expenses.
      </p>
      <div style={{ marginTop: "1.5rem" }}>
        <h3>Expenses</h3>
        {expenses.length === 0 ? (
          <p>No expenses in this group yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {expenses.map((expense) => (
              <li
                key={expense.id}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "baseline",
                  gap: "0.5rem 1rem",
                  padding: "0.6rem 0",
                  borderBottom: "1px solid #e5e5e5",
                }}
              >
                <span style={{ fontWeight: 600 }}>{expense.description}</span>
                <span>{formatCurrency(Number(expense.amount))}</span>
                <span
                  style={{
                    fontSize: "0.85rem",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "999px",
                    background: "#eef2ff",
                    color: "#3730a3",
                  }}
                >
                  {formatCategoryLabel(expense.category)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

export default GroupView;
