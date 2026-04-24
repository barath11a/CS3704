"""Unit tests for services/split_service.py.

Covers compute_split (equal/custom/percent + error paths) and simplify_debts.

AI use: tests below the "BEGIN AI-ASSISTED" marker were drafted with help
from Claude using the prompt at the top of conftest.py and then reviewed
against services/split_service.py. The first three tests pre-date PM4 and
were authored without AI.
"""

import pytest

from services.split_service import compute_split, simplify_debts


# --- Pre-existing tests (no AI) -------------------------------------------

def test_equal_split():
    shares = compute_split(30.00, [1, 2, 3], method="equal")
    assert shares == {1: 10.00, 2: 10.00, 3: 10.00}


def test_custom_split():
    shares = compute_split(
        40.00, [1, 2], method="custom", custom_shares={1: 25.00, 2: 15.00}
    )
    assert shares == {1: 25.00, 2: 15.00}


def test_simplify_debts():
    balances = {1: -20, 2: -10, 3: 30}
    transfers = simplify_debts(balances)
    assert sum(t[2] for t in transfers) == 30


# --- BEGIN AI-ASSISTED ----------------------------------------------------

def test_compute_split_empty_participants_returns_empty_dict():
    # Edge case: no participants -> no shares, no division-by-zero.
    assert compute_split(50.0, [], method="equal") == {}


def test_compute_split_percent_method():
    shares = compute_split(
        200.00, [1, 2], method="percent", custom_shares={1: 25, 2: 75}
    )
    assert shares == {1: 50.00, 2: 150.00}


def test_compute_split_custom_requires_custom_shares():
    with pytest.raises(ValueError):
        compute_split(40.0, [1, 2], method="custom", custom_shares=None)


def test_compute_split_percent_requires_custom_shares():
    with pytest.raises(ValueError):
        compute_split(40.0, [1, 2], method="percent", custom_shares=None)


def test_compute_split_unknown_method_raises():
    with pytest.raises(ValueError):
        compute_split(40.0, [1, 2], method="bogus")


def test_simplify_debts_balanced_empty():
    # When everyone is settled, there should be no transfers at all.
    assert simplify_debts({1: 0, 2: 0}) == []


def test_simplify_debts_chains_multiple_creditors():
    # One debtor pays multiple creditors until their debt is cleared.
    balances = {1: -30, 2: 10, 3: 20}
    transfers = simplify_debts(balances)
    paid_to = {creditor: amt for _, creditor, amt in transfers}
    assert paid_to[3] == 20
    assert paid_to[2] == 10
    assert sum(t[2] for t in transfers) == 30
