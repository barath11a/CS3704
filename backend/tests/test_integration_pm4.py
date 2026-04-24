"""End-to-end integration test exercising multiple PM4 functions together.

Scenario (one full flow that hits every PM4 contributor's code):
  1. Two users register (Haradeep: hashed-password register + JWT issuance)
  2. The first user logs in with their password (Haradeep: login)
  3. They create a group via the JWT-protected endpoint (Haradeep: create_group)
  4. The second user is added as a member (existing add_member route)
  5. They post an expense, exercising add_expense input validation +
     compute_split persistence (Vedanth + split_service)
  6. They list all expenses via the previously-broken GET / route
     (Vedanth: get_all_expenses)
  7. They fetch reminders, which run compute_group_balances under the hood
     (Ronit: live balance computation + JWT-protected fetch). The Amanjeet
     net-balance summary on the frontend is computed from the same data
     this endpoint returns, so this also exercises the data path it relies on.

AI use: Drafted with Claude using the conftest.py prompt. Each assertion
mirrors a real user flow rather than directly poking the database.
"""


def test_full_pm4_flow(client):
    # 1) Register two users.
    r1 = client.post(
        "/api/auth/register",
        json={"name": "Alice", "email": "alice@x.com", "password": "pw1"},
    )
    r2 = client.post(
        "/api/auth/register",
        json={"name": "Bob", "email": "bob@x.com", "password": "pw2"},
    )
    assert r1.status_code == 201 and r2.status_code == 201
    alice_id = r1.get_json()["user"]["id"]
    bob_id = r2.get_json()["user"]["id"]

    # 2) Alice logs in fresh (verifies password hashing round-trip).
    login = client.post(
        "/api/auth/login",
        json={"email": "alice@x.com", "password": "pw1"},
    )
    assert login.status_code == 200
    alice_token = login.get_json()["token"]
    alice_auth = {"Authorization": f"Bearer {alice_token}"}

    # 3) Alice creates a group; owner derives from JWT, not request body.
    g = client.post("/api/groups", json={"name": "Trip"}, headers=alice_auth)
    assert g.status_code == 201
    group = g.get_json()
    assert group["owner_id"] == alice_id
    group_id = group["id"]

    # 4) Add Bob as a member.
    add = client.post(f"/api/groups/{group_id}/members", json={"user_id": bob_id})
    assert add.status_code == 201

    # 5) Alice posts an expense; both must owe equally.
    bad = client.post(
        "/api/expenses/",
        json={"group_id": group_id, "payer_id": alice_id, "amount": 60.0},
    )
    assert bad.status_code == 400  # validation: missing 'description'

    expense = client.post(
        "/api/expenses/",
        json={
            "group_id": group_id,
            "payer_id": alice_id,
            "description": "Dinner",
            "amount": 60.0,
            "participants": [alice_id, bob_id],
        },
    )
    assert expense.status_code == 201
    body = expense.get_json()
    assert body["amount"] == 60.0
    shares_by_user = {s["user_id"]: s["amount_owed"] for s in body["shares"]}
    assert shares_by_user[alice_id] == 30.0
    assert shares_by_user[bob_id] == 30.0

    # 6) GET /api/expenses/ — Vedanth's previously-404'ing route.
    all_exp = client.get("/api/expenses/")
    assert all_exp.status_code == 200
    listing = all_exp.get_json()
    assert len(listing) == 1
    assert listing[0]["description"] == "Dinner"

    # 7) Reminders for Alice should report Bob owes her $30 (kind=owed_to_you).
    rem = client.get("/api/reminders", headers=alice_auth)
    assert rem.status_code == 200
    items = rem.get_json()["items"]
    assert len(items) == 1
    assert items[0]["kind"] == "owed_to_you"
    assert items[0]["amount"] == 30.0
    assert items[0]["group_id"] == group_id

    # 7b) Reminders for Bob should mirror as you_owe $30.
    bob_login = client.post(
        "/api/auth/login", json={"email": "bob@x.com", "password": "pw2"}
    )
    bob_token = bob_login.get_json()["token"]
    rem_bob = client.get(
        "/api/reminders", headers={"Authorization": f"Bearer {bob_token}"}
    )
    items_bob = rem_bob.get_json()["items"]
    assert len(items_bob) == 1
    assert items_bob[0]["kind"] == "you_owe"
    assert items_bob[0]["amount"] == 30.0
