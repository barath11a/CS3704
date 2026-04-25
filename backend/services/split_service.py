"""Split calculation logic for expenses."""


def compute_split(amount, participants, method="equal", custom_shares=None):
    """Return a dict {user_id: amount_owed}.

    method:
        "equal"   - split evenly across participants
        "custom"  - use exact values from custom_shares
        "percent" - use percentages from custom_shares (values must sum to 100)
    """
    if amount is None or float(amount) < 0:
        raise ValueError("amount must be a non-negative number")

    if not participants:
        return {}

    if method == "equal":
        share = round(amount / len(participants), 2)
        return {uid: share for uid in participants}

    if method == "custom":
        if not custom_shares:
            raise ValueError("custom_shares required for custom split")
        return {int(uid): float(v) for uid, v in custom_shares.items()}

    if method == "percent":
        if not custom_shares:
            raise ValueError("custom_shares (percentages) required for percent split")
        total_pct = sum(float(p) for p in custom_shares.values())
        if abs(total_pct - 100.0) > 0.01:
            raise ValueError(
                f"percent shares must sum to 100 (got {total_pct})"
            )
        return {
            int(uid): round(amount * float(pct) / 100.0, 2)
            for uid, pct in custom_shares.items()
        }

    raise ValueError(f"unknown split method: {method}")


def simplify_debts(balances):
    """Given {user_id: net_balance} (positive = owed money, negative = owes),
    return a minimal list of (debtor, creditor, amount) transfers.
    Placeholder greedy implementation.
    """
    creditors = sorted(
        [(u, b) for u, b in balances.items() if b > 0], key=lambda x: -x[1]
    )
    debtors = sorted(
        [(u, -b) for u, b in balances.items() if b < 0], key=lambda x: -x[1]
    )

    transfers = []
    i = j = 0
    while i < len(debtors) and j < len(creditors):
        d_user, d_amt = debtors[i]
        c_user, c_amt = creditors[j]
        pay = round(min(d_amt, c_amt), 2)
        transfers.append((d_user, c_user, pay))
        debtors[i] = (d_user, d_amt - pay)
        creditors[j] = (c_user, c_amt - pay)
        if debtors[i][1] == 0:
            i += 1
        if creditors[j][1] == 0:
            j += 1
    return transfers
