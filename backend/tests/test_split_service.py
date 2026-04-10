import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.split_service import compute_split, simplify_debts


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
