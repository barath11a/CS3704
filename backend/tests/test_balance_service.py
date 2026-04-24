"""Unit tests for services/balance_service.compute_group_balances.

This service drives both the reminder banner (Ronit) and the net balance
summary on the group page (Amanjeet) in PM4.

AI use: the two tests above the "BEGIN AI-ASSISTED" marker pre-date PM4 and
were not AI-generated. The remaining tests were drafted with Claude using
the conftest.py prompt and verified against services/balance_service.py.
"""

from types import SimpleNamespace

from services.balance_service import compute_group_balances


def _share(uid, owed, settled=False):
    return SimpleNamespace(user_id=uid, amount_owed=owed, settled=settled)


def _expense(pid, amount, shares):
    return SimpleNamespace(payer_id=pid, amount=amount, shares=shares)


# --- Pre-existing tests ---------------------------------------------------

def test_simple_split():
    ex = [_expense(1, 100.0, [_share(1, 50.0), _share(2, 50.0)])]
    bal = compute_group_balances(ex)
    assert bal[1] == 50.0
    assert bal[2] == -50.0


def test_settled_share_reduces_debt_and_payer_credit():
    ex = [_expense(1, 100.0, [_share(1, 50.0), _share(2, 50.0, settled=True)])]
    bal = compute_group_balances(ex)
    assert bal[2] == 0.0
    assert bal[1] == 0.0


# --- BEGIN AI-ASSISTED ----------------------------------------------------

def test_no_expenses_returns_empty_balances():
    assert compute_group_balances([]) == {}


def test_three_way_equal_split():
    # User 1 fronts $90, all three owe $30 each.
    ex = [_expense(1, 90.0, [_share(1, 30.0), _share(2, 30.0), _share(3, 30.0)])]
    bal = compute_group_balances(ex)
    assert bal[1] == 60.0
    assert bal[2] == -30.0
    assert bal[3] == -30.0
    # Net of all balances must always sum to zero (conservation of money).
    assert round(sum(bal.values()), 2) == 0.0


def test_multiple_expenses_accumulate_across_payers():
    # Two expenses with different payers; balances should compose.
    ex = [
        _expense(1, 60.0, [_share(1, 30.0), _share(2, 30.0)]),
        _expense(2, 40.0, [_share(1, 20.0), _share(2, 20.0)]),
    ]
    bal = compute_group_balances(ex)
    # User 1 fronted 60, owes 30 + 20 = 50 -> +10
    # User 2 fronted 40, owes 30 + 20 = 50 -> -10
    assert bal[1] == 10.0
    assert bal[2] == -10.0


def test_balances_are_rounded_to_two_decimals():
    ex = [_expense(1, 10.0, [_share(1, 3.33), _share(2, 3.33), _share(3, 3.34)])]
    bal = compute_group_balances(ex)
    for v in bal.values():
        # Float precision sanity: returned values should match a 2-decimal rounding.
        assert round(v, 2) == v
