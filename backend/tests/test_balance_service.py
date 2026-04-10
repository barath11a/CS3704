"""Tests for balance_service.compute_group_balances."""

from types import SimpleNamespace

from services.balance_service import compute_group_balances


def _share(uid, owed, settled=False):
    return SimpleNamespace(user_id=uid, amount_owed=owed, settled=settled)


def _expense(pid, amount, shares):
    return SimpleNamespace(payer_id=pid, amount=amount, shares=shares)


def test_simple_split():
    ex = [
        _expense(1, 100.0, [_share(1, 50.0), _share(2, 50.0)]),
    ]
    bal = compute_group_balances(ex)
    assert bal[1] == 50.0
    assert bal[2] == -50.0


def test_settled_share_reduces_debt_and_payer_credit():
    ex = [
        _expense(1, 100.0, [_share(1, 50.0), _share(2, 50.0, settled=True)]),
    ]
    bal = compute_group_balances(ex)
    assert bal[2] == 0.0
    # Payer fronted 100, owes 50 own share, credited 50 when 2 settled → net 0
    assert bal[1] == 0.0
