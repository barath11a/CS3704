"""Unit tests for services/ocr_service.py.

extract_receipt_total is hard to test deterministically without Tesseract
installed; we verify the graceful-failure path with a non-image stream.
categorize_expense is a pure function and gets full keyword coverage.

AI use: All tests in this file were drafted with Claude using the prompt
in conftest.py and reviewed against services/ocr_service.py.
"""

from io import BytesIO

from services.ocr_service import categorize_expense, extract_receipt_total


# --- categorize_expense ---------------------------------------------------

def test_categorize_food_keywords():
    assert categorize_expense("Pizza Friday") == "food"
    assert categorize_expense("Lunch at the cafe") == "food"


def test_categorize_transport_keywords():
    assert categorize_expense("Uber to airport") == "transport"
    assert categorize_expense("Train tickets") == "transport"


def test_categorize_lodging_keywords():
    assert categorize_expense("Airbnb for the weekend") == "lodging"


def test_categorize_groceries_keywords():
    assert categorize_expense("Walmart run") == "groceries"


def test_categorize_unknown_falls_back_to_uncategorized():
    assert categorize_expense("random one-off purchase") == "uncategorized"


def test_categorize_is_case_insensitive():
    assert categorize_expense("PIZZA NIGHT") == "food"


# --- extract_receipt_total ------------------------------------------------

def test_extract_receipt_total_handles_invalid_stream_gracefully():
    # Not a real image: function should swallow the exception and return None
    # rather than crashing the request handler.
    fake_stream = BytesIO(b"not an image")
    result = extract_receipt_total(fake_stream)
    assert result is None
