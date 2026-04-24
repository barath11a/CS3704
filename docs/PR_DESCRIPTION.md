# [AI-assisted] Input validation + Subtotal OCR bug fix

**AI policy label:** AI-assisted (Claude was used to help draft the fix and tests; prompts and review notes below).

## Summary
- Fix a real bug in `services/ocr_service.py::extract_receipt_total`. The old check `"total" in line.lower()` also matches `"Subtotal"`, so any receipt where the subtotal line appears after the total line would cause the wrong number to be detected. Now uses a word-boundary regex and explicitly excludes `subtotal`.
- Harden `services/split_service.py::compute_split` with two pieces of input validation:
  - reject negative `amount` early with a clear `ValueError` (previously would silently produce negative shares)
  - for `percent` split, require the supplied percentages to sum to ~100 (`±0.01` tolerance)
- Add unit tests for the new error paths and two regression tests for the subtotal OCR bug (using `monkeypatch` to stub out `pytesseract` / `PIL` so the tests don't need Tesseract installed).

## Why
- Subtotal-vs-Total is a classic receipt-parsing footgun and would silently corrupt expense amounts entered via `/api/expenses/scan`.
- `compute_split` was trusting its caller. Route-level validation in `routes/expenses.py` catches missing fields but doesn't catch nonsense values, so bad data was reaching the service layer.

## Test plan
- [x] `pytest backend/tests/` — **23/23 passing** locally (includes previous 19 + 4 new).
- [x] New test `test_negative_amount_raises` covers negative amount rejection.
- [x] New test `test_percent_shares_must_sum_to_100` covers percent-validation.
- [x] New tests `test_extract_receipt_total_ignores_subtotal` and `test_extract_receipt_total_subtotal_after_total` cover the OCR regression.

## AI usage disclosure (per course AI policy)
Claude (Anthropic) was used to:
1. Identify the subtotal collision bug while reading `ocr_service.py`.
2. Draft the regex fix and the two regression tests.
3. Draft the percent-sum validation.

Prompt used (paraphrased): *"Review `services/ocr_service.py` and `services/split_service.py` for real bugs or missing validation. Propose a minimal fix with pytest coverage, mocking Tesseract so the tests don't require a real install."*

All generated code was read line-by-line, edited, and verified locally before committing.
