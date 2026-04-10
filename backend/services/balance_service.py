"""Net balance per member from expenses and share settlement flags."""


def compute_group_balances(expenses):
    """Return {user_id: net_balance}.

    Positive balance: others still owe this user net of what they fronted.
    Negative balance: this user still owes others on net.

    Unsettled shares count as outstanding debt. When a share is settled, the
    payer is treated as having been repaid that portion.
    """
    balances = {}
    for expense in expenses:
        payer_id = expense.payer_id
        amount = float(expense.amount)
        balances[payer_id] = balances.get(payer_id, 0.0) + amount
        for share in expense.shares:
            uid = share.user_id
            owed = float(share.amount_owed)
            balances[uid] = balances.get(uid, 0.0) - owed
            if share.settled:
                balances[uid] = balances.get(uid, 0.0) + owed
                balances[payer_id] = balances.get(payer_id, 0.0) - owed

    return {uid: round(bal, 2) for uid, bal in balances.items()}
