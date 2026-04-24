# Peer Code Review — "added in-app reminders"

**Reviewer:** Barath (barath11a)
**Author of code under review:** Ronit Mehta
**Commit reviewed:** `89d22c3` — *added in-app reminders* (Made-with: Cursor, per commit trailer)
**Files reviewed:**
- `backend/routes/reminders.py`
- `backend/services/balance_service.py`
- `backend/tests/test_balance_service.py`
- `frontend/src/components/RemindersBanner.js`
- `frontend/src/index.css` (skimmed)
- small edits in `backend/app.py`, `frontend/src/App.js`, `frontend/src/services/api.js`

---

## Overview

Overall this is a solid feature add. It spans the whole stack — a new backend blueprint, a small balance service, a test file for it, and a frontend banner that pulls reminders and lets the user dismiss them. The scoping feels right: it reuses the existing models and doesn't rewrite things. I was able to read through it without getting lost, which is a good sign for a feature this size. A few things I'd want tightened before merging, mostly around the backend service logic, but nothing that needs a rewrite.

## Correctness

- `compute_group_balances` in [backend/services/balance_service.py](../backend/services/balance_service.py) looks right for the typical case, and the two tests in `test_balance_service.py` confirm the happy path and the settled-share case. Nice that the settled case is tested because that's the easy one to get wrong.
- One thing that bugged me: on line 22 of `balance_service.py`, when `share.settled` is true, the code does a second `balances[uid] = balances.get(uid, 0.0) + owed` and credits the payer. That's logically correct, but note it only runs *after* you already subtracted `owed` on line 21, so the two cancel — a small refactor could make that clearer (e.g. skip the subtraction entirely when the share is settled). As-is it works but it's easy to misread.
- In [backend/routes/reminders.py](../backend/routes/reminders.py), `_user_group_ids` queries groups where the user is owner OR a member. I think that's fine, but the current endpoint doesn't paginate — for a user in many groups this could be slow. Probably not a blocker for PM4 scope but worth a TODO.
- `list_reminders` loops groups and issues a separate `Expense.query.filter_by(...)` per group inside the loop (line 37-42). That's an N+1 pattern. Works for a demo but will bite later.
- On the frontend, `RemindersBanner` dismisses by `${r.group_id}:${r.kind}` key. If the same group ends up with both `you_owe` and `owed_to_you` at different times, that's probably fine, but I couldn't see a case in the backend where both would be emitted for the same group simultaneously — so the composite key is slightly over-engineered. Not wrong, just unnecessary.

## Clarity

- The backend code is pretty readable. `reminders.py` uses clear variable names (`owe_first`, `credit`, `ordered`) and the ordering decision at the bottom is obvious.
- I like that `_MIN = 0.01` is a named constant instead of a magic number.
- The f-strings with curly quotes (`“{group.name}”`) are a nice touch for the user-facing message.
- `RemindersBanner.js` is a long-ish component but the hooks are split reasonably. I had to squint a bit at the `useEffect` that listens to `iges-auth-change` — a short comment explaining why it needs a custom DOM event (vs. just a context update) would have helped. If it's because the auth state lives in `localStorage` and there's no context, that's worth saying.
- `readDismissed()` wraps the JSON parse in try/catch which I appreciate. It's the kind of thing that *will* crash on malformed storage if you forget.

## Maintainability

- Style is mostly consistent with the rest of the repo. Python side uses the same import ordering and blueprint pattern as `routes/expenses.py`.
- The test file in `tests/test_balance_service.py` uses `SimpleNamespace` as a quick stand-in for ORM objects, which is clever and keeps the test light, but note that it diverges from how `test_split_service.py` is structured. That's fine — both approaches are valid — but a comment at the top of either file explaining the testing approach would help the next person.
- `RemindersBanner` hardcodes `DISMISS_KEY = "iges_reminder_dismissed"` — probably should live with other storage keys in `services/api.js` next to `AUTH_TOKEN_KEY` so they're all in one place.
- No docstrings on `list_reminders`. The function is small enough that it's obvious, but given this is a new public API endpoint, a one-line docstring describing the response shape would help.

## AI-Specific Concerns

Commit trailer says "Made-with: Cursor", so at least part of this was AI-assisted. A few things I noticed that feel AI-ish:

- The N+1 query pattern (one `Expense.query` per group) is the kind of thing an LLM will happily emit because it looks correct at the unit level. A human reviewer catches it because they're thinking about scale. **Lesson:** don't trust AI for data-access patterns without reading the loop structure.
- The frontend dismissal key format `${group_id}:${kind}` is slightly over-general for what the backend actually emits. Smells like the AI designed for a more general case than the backend supports.
- On the positive side the test file is clean and uses `SimpleNamespace` mocking well — that's something I think AI does well, and it would have taken me longer to hand-write.
- The commit message is terse ("added in-app reminders") — AI tools will usually suggest more descriptive messages if asked, so this was likely a human choice. Fine, but for a feature this size, a multi-line description would make future git-archaeology easier.

**Takeaway for me:** AI is great at the scaffolding (routes, hooks, test harnesses) but tends to miss cross-cutting concerns like query performance and key-space design. Worth reviewing those manually every time.

## Recommendation

**Return for changes** (minor). Nothing here is wrong enough to close, and most of it works as-is for the PM4 scope, but I'd want at least:
1. A fix for the N+1 query in `list_reminders` (single `Expense.query.filter(Expense.group_id.in_(group_ids))` and group in Python, or a join).
2. A one-line docstring on the new public endpoint.
3. Optional: clean up the double-write in `balance_service.py` when a share is settled.

After those I'd be happy to merge. Per the assignment I am **not** actually applying a recommendation / merging — leaving the PR open for grading.
