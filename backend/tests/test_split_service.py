"""Unit and integration tests for the Intelligent Group Expense Splitter.

AI Usage Disclosure (per course AI policy)
------------------------------------------
Portions of these tests were generated with the assistance of Claude
(Anthropic). Prompt used:

    "Generate unit tests (at least one per function) and an integration
     test for the split_service and ocr_service modules of the
     IntelligentGroupExpenseSplitter PM4 backend. Use pytest. Cover
     equal/custom/percent splits, error paths, simplify_debts, the
     keyword-based categorize_expense function, and a full end-to-end
     flow that ties categorize_expense -> compute_split -> simplify_debts
     together."

All generated tests were reviewed, edited, and verified to pass locally
before being committed.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.split_service import compute_split, simplify_debts
from services.ocr_service import categorize_expense, extract_receipt_total


# ---------------------------------------------------------------------------
# Unit tests: compute_split
# ---------------------------------------------------------------------------

def test_equal_split():
    """compute_split divides the amount evenly across all participants."""
    shares = compute_split(30.00, [1, 2, 3], method="equal")
    assert shares == {1: 10.00, 2: 10.00, 3: 10.00}


def test_equal_split_rounds_to_two_decimals():
    """Equal split of an amount that doesn't divide evenly is rounded."""
    shares = compute_split(10.00, [1, 2, 3], method="equal")
    # 10 / 3 = 3.3333... -> rounded to 3.33
    assert shares == {1: 3.33, 2: 3.33, 3: 3.33}


def test_custom_split():
    """Custom split returns the exact amounts supplied by the caller."""
    shares = compute_split(
        40.00, [1, 2], method="custom", custom_shares={1: 25.00, 2: 15.00}
    )
    assert shares == {1: 25.00, 2: 15.00}


def test_custom_split_missing_shares_raises():
    """Custom split without custom_shares must raise ValueError."""
    with pytest.raises(ValueError):
        compute_split(40.00, [1, 2], method="custom")


def test_percent_split():
    """Percent split multiplies amount by percentage for each participant."""
    shares = compute_split(
        100.00, [1, 2], method="percent", custom_shares={1: 70, 2: 30}
    )
    assert shares == {1: 70.00, 2: 30.00}


def test_percent_split_missing_shares_raises():
    """Percent split without percentages must raise ValueError."""
    with pytest.raises(ValueError):
        compute_split(100.00, [1, 2], method="percent")


def test_unknown_method_raises():
    """Unknown split method must raise ValueError."""
    with pytest.raises(ValueError):
        compute_split(50.00, [1, 2], method="bogus")


def test_negative_amount_raises():
    """Negative amount must raise ValueError regardless of method."""
    with pytest.raises(ValueError):
        compute_split(-5.00, [1, 2], method="equal")


def test_percent_shares_must_sum_to_100():
    """Percent split rejects percentages that don't sum to 100."""
    with pytest.raises(ValueError):
        compute_split(
            100.00, [1, 2], method="percent", custom_shares={1: 60, 2: 30}
        )


def test_empty_participants_returns_empty_dict():
    """No participants means nothing to split."""
    assert compute_split(50.00, [], method="equal") == {}


# ---------------------------------------------------------------------------
# Unit tests: simplify_debts
# ---------------------------------------------------------------------------

def test_simplify_debts_conservation():
    """Sum of transfers must equal the total positive balance."""
    balances = {1: -20, 2: -10, 3: 30}
    transfers = simplify_debts(balances)
    assert sum(t[2] for t in transfers) == 30


def test_simplify_debts_single_creditor():
    """One debtor and one creditor produces a single transfer."""
    transfers = simplify_debts({1: -15, 2: 15})
    assert transfers == [(1, 2, 15)]


def test_simplify_debts_balanced_ledger():
    """A zero-balance ledger produces no transfers."""
    assert simplify_debts({1: 0, 2: 0}) == []


# ---------------------------------------------------------------------------
# Unit tests: categorize_expense
# ---------------------------------------------------------------------------

def test_categorize_expense_food():
    assert categorize_expense("Team dinner at the pizza place") == "food"


def test_categorize_expense_transport():
    assert categorize_expense("Uber to the airport") == "transport"


def test_categorize_expense_lodging():
    assert categorize_expense("Airbnb for the weekend") == "lodging"


def test_categorize_expense_groceries():
    assert categorize_expense("Walmart run") == "groceries"


def test_categorize_expense_uncategorized():
    assert categorize_expense("Random miscellaneous thing") == "uncategorized"


# ---------------------------------------------------------------------------
# Unit tests: extract_receipt_total (regression for "Subtotal" collision)
# ---------------------------------------------------------------------------

def _make_fake_ocr(monkeypatch, text):
    """Patch pytesseract + PIL.Image so extract_receipt_total returns `text`."""
    import types
    fake_pytesseract = types.SimpleNamespace(
        image_to_string=lambda _img: text
    )
    fake_pil_image = types.SimpleNamespace(open=lambda _s: object())

    import sys as _sys
    monkeypatch.setitem(_sys.modules, "pytesseract", fake_pytesseract)

    pil_pkg = types.ModuleType("PIL")
    pil_pkg.Image = fake_pil_image
    monkeypatch.setitem(_sys.modules, "PIL", pil_pkg)
    monkeypatch.setitem(_sys.modules, "PIL.Image", fake_pil_image)


def test_extract_receipt_total_ignores_subtotal(monkeypatch):
    """Regression: 'Subtotal' lines must not be treated as the final total."""
    receipt = "Item A 5.00\nItem B 5.00\nSubtotal  10.00\nTax 1.00\nTotal 11.00\n"
    _make_fake_ocr(monkeypatch, receipt)
    assert extract_receipt_total("dummy_stream") == 11.00


def test_extract_receipt_total_subtotal_after_total(monkeypatch):
    """Even if Subtotal appears AFTER Total in the OCR text, we still pick Total."""
    receipt = "Total 11.00\nSubtotal 10.00\n"
    _make_fake_ocr(monkeypatch, receipt)
    assert extract_receipt_total("dummy_stream") == 11.00


# ---------------------------------------------------------------------------
# Integration test: categorize -> compute_split -> simplify_debts
# ---------------------------------------------------------------------------

def test_end_to_end_group_expense_flow():
    """Full flow: three roommates split two expenses paid by different payers,
    net balances are computed, and simplify_debts produces a minimal set of
    settlement transfers.

    Scenario
    --------
      Users:    Alice=1, Bob=2, Carol=3
      Expense A: Alice pays $60 "pizza dinner", split equally among all three.
      Expense B: Bob pays $30 "Uber to concert", split equally among all three.

    Expected net balances:
      Alice: +60 paid - 20 share - 10 share = +30  (is owed $30)
      Bob:   +30 paid - 20 share - 10 share =   0
      Carol: +0 paid  - 20 share - 10 share = -30  (owes $30)

    Expected settlement: Carol -> Alice, $30.
    """

    # 1. Categorize each expense description (exercises ocr_service).
    category_a = categorize_expense("pizza dinner")
    category_b = categorize_expense("Uber to concert")
    assert category_a == "food"
    assert category_b == "transport"

    participants = [1, 2, 3]

    # 2. Compute per-user shares using split_service.
    shares_a = compute_split(60.00, participants, method="equal")
    shares_b = compute_split(30.00, participants, method="equal")
    assert shares_a == {1: 20.00, 2: 20.00, 3: 20.00}
    assert shares_b == {1: 10.00, 2: 10.00, 3: 10.00}

    # 3. Build net balances: payer gets credited the full amount, every
    #    participant is debited their share.
    balances = {uid: 0.0 for uid in participants}

    payer_a, amount_a = 1, 60.00
    balances[payer_a] += amount_a
    for uid, share in shares_a.items():
        balances[uid] -= share

    payer_b, amount_b = 2, 30.00
    balances[payer_b] += amount_b
    for uid, share in shares_b.items():
        balances[uid] -= share

    assert balances[1] == pytest.approx(30.00)
    assert balances[2] == pytest.approx(0.00)
    assert balances[3] == pytest.approx(-30.00)

    # 4. Minimize cash transfers using simplify_debts.
    transfers = simplify_debts(balances)

    # Only Carol needs to pay Alice; Bob is square.
    assert transfers == [(3, 1, 30.00)]

    # Conservation: total of transfers equals total positive balance.
    total_owed = sum(b for b in balances.values() if b > 0)
    assert sum(t[2] for t in transfers) == pytest.approx(total_owed)
