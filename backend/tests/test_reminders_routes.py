"""Tests for routes/reminders.py (Ronit's PM4 contribution).

The reminders route is JWT-protected and aggregates per-group balances
into a banner-friendly payload. We verify auth, the "you owe" path, and
the "owed to you" path.

AI use: Drafted with Claude using the conftest.py prompt and reviewed
against routes/reminders.py and services/balance_service.py.
"""

from models import db
from models.expense import Expense, ExpenseShare
from models.group import Group, GroupMember


def test_reminders_requires_jwt(client):
    resp = client.get("/api/reminders")
    assert resp.status_code == 401


def test_reminders_reports_amount_owed(client, user_factory, app):
    payer, payer_token, _ = user_factory()  # someone else fronted the bill
    debtor, debtor_token, _ = user_factory()  # debtor user we're testing as

    with app.app_context():
        g = Group(name="Apt", owner_id=payer.id)
        db.session.add(g)
        db.session.flush()
        db.session.add_all([
            GroupMember(group_id=g.id, user_id=payer.id),
            GroupMember(group_id=g.id, user_id=debtor.id),
        ])
        ex = Expense(group_id=g.id, payer_id=payer.id, description="Rent", amount=100.0)
        db.session.add(ex)
        db.session.flush()
        db.session.add_all([
            ExpenseShare(expense_id=ex.id, user_id=payer.id, amount_owed=50.0),
            ExpenseShare(expense_id=ex.id, user_id=debtor.id, amount_owed=50.0),
        ])
        db.session.commit()

    resp = client.get(
        "/api/reminders",
        headers={"Authorization": f"Bearer {debtor_token}"},
    )
    assert resp.status_code == 200
    items = resp.get_json()["items"]
    assert len(items) == 1
    assert items[0]["kind"] == "you_owe"
    assert items[0]["amount"] == 50.0


def test_reminders_reports_amount_owed_to_user(client, user_factory, app):
    payer, payer_token, _ = user_factory()
    debtor, _, _ = user_factory()

    with app.app_context():
        g = Group(name="Apt2", owner_id=payer.id)
        db.session.add(g)
        db.session.flush()
        db.session.add_all([
            GroupMember(group_id=g.id, user_id=payer.id),
            GroupMember(group_id=g.id, user_id=debtor.id),
        ])
        ex = Expense(group_id=g.id, payer_id=payer.id, description="Pizza", amount=40.0)
        db.session.add(ex)
        db.session.flush()
        db.session.add_all([
            ExpenseShare(expense_id=ex.id, user_id=payer.id, amount_owed=20.0),
            ExpenseShare(expense_id=ex.id, user_id=debtor.id, amount_owed=20.0),
        ])
        db.session.commit()

    resp = client.get(
        "/api/reminders",
        headers={"Authorization": f"Bearer {payer_token}"},
    )
    assert resp.status_code == 200
    items = resp.get_json()["items"]
    assert len(items) == 1
    assert items[0]["kind"] == "owed_to_you"
    assert items[0]["amount"] == 20.0


def test_reminders_empty_when_no_outstanding_balance(client, auth_header):
    _, headers = auth_header
    resp = client.get("/api/reminders", headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()["items"] == []
