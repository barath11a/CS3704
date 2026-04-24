"""Tests for routes/expenses.py (Vedanth's PM4 contribution).

Covers:
  - add_expense input validation (the new conditional checks)
  - add_expense happy-path persists shares
  - get_all_expenses (the new GET / route that previously 404'd)
  - list_group_expenses scoping

AI use: Drafted with Claude using the conftest.py prompt and reviewed
against routes/expenses.py.
"""

from models import db
from models.expense import Expense, ExpenseShare


def test_add_expense_rejects_missing_required_fields(client):
    # Missing amount, description, payer_id, group_id, etc.
    resp = client.post("/api/expenses/", json={"group_id": 1})
    assert resp.status_code == 400
    assert "missing" in resp.get_json()["error"].lower()


def test_add_expense_rejects_empty_participants(client):
    resp = client.post(
        "/api/expenses/",
        json={
            "group_id": 1,
            "payer_id": 1,
            "description": "Lunch",
            "amount": 30.0,
            "participants": [],
        },
    )
    assert resp.status_code == 400
    assert "participants" in resp.get_json()["error"].lower()


def test_add_expense_persists_equal_split(client, app):
    resp = client.post(
        "/api/expenses/",
        json={
            "group_id": 1,
            "payer_id": 1,
            "description": "Pizza",
            "amount": 30.0,
            "participants": [1, 2, 3],
        },
    )
    assert resp.status_code == 201
    body = resp.get_json()
    assert body["amount"] == 30.0
    assert body["description"] == "Pizza"
    assert len(body["shares"]) == 3
    assert all(s["amount_owed"] == 10.0 for s in body["shares"])

    with app.app_context():
        expenses = Expense.query.all()
        assert len(expenses) == 1
        shares = ExpenseShare.query.all()
        assert len(shares) == 3


def test_get_all_expenses_returns_every_expense(client, app):
    """Vedanth's new GET /api/expenses/ route — was returning 404 before PM4."""
    with app.app_context():
        db.session.add(Expense(group_id=1, payer_id=1, description="A", amount=10.0))
        db.session.add(Expense(group_id=2, payer_id=2, description="B", amount=20.0))
        db.session.commit()

    resp = client.get("/api/expenses/")
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data) == 2
    descriptions = sorted(e["description"] for e in data)
    assert descriptions == ["A", "B"]


def test_list_group_expenses_filters_by_group(client, app):
    with app.app_context():
        db.session.add(Expense(group_id=1, payer_id=1, description="In", amount=5.0))
        db.session.add(Expense(group_id=2, payer_id=1, description="Out", amount=5.0))
        db.session.commit()

    resp = client.get("/api/expenses/group/1")
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data) == 1
    assert data[0]["description"] == "In"


def test_scan_receipt_requires_image_file(client):
    resp = client.post("/api/expenses/scan", data={})
    assert resp.status_code == 400
    assert "image" in resp.get_json()["error"].lower()
