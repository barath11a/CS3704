"""Tests for routes/auth.py (Haradeep's PM4 contribution).

Covers:
  - register: hashed-password storage, duplicate-email rejection, missing fields
  - login: valid credentials issue a token, bad password is rejected

AI use: Drafted with Claude using the conftest.py prompt and reviewed
against routes/auth.py and models/user.py.
"""

from models.user import User


def test_register_creates_user_hashes_password_and_returns_token(client, app):
    resp = client.post(
        "/api/auth/register",
        json={"name": "Alice", "email": "alice@example.com", "password": "s3cret!"},
    )
    assert resp.status_code == 201
    body = resp.get_json()
    assert "token" in body and isinstance(body["token"], str) and body["token"]
    assert body["user"]["email"] == "alice@example.com"

    with app.app_context():
        user = User.query.filter_by(email="alice@example.com").first()
        assert user is not None
        # Plaintext password must NEVER appear in storage.
        assert user.password_hash != "s3cret!"
        assert user.password_hash.startswith(("pbkdf2:", "scrypt:"))


def test_register_rejects_missing_fields(client):
    resp = client.post("/api/auth/register", json={"email": "x@x.com"})
    assert resp.status_code == 400


def test_register_rejects_duplicate_email(client):
    client.post(
        "/api/auth/register",
        json={"name": "Alice", "email": "dup@example.com", "password": "pw"},
    )
    resp = client.post(
        "/api/auth/register",
        json={"name": "Alice2", "email": "dup@example.com", "password": "pw2"},
    )
    assert resp.status_code == 409


def test_login_with_valid_credentials_returns_token(client):
    client.post(
        "/api/auth/register",
        json={"name": "Bob", "email": "bob@example.com", "password": "pw"},
    )
    resp = client.post(
        "/api/auth/login",
        json={"email": "bob@example.com", "password": "pw"},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body["token"]
    assert body["user"]["email"] == "bob@example.com"


def test_login_with_wrong_password_is_rejected(client):
    client.post(
        "/api/auth/register",
        json={"name": "Bob", "email": "bob2@example.com", "password": "pw"},
    )
    resp = client.post(
        "/api/auth/login",
        json={"email": "bob2@example.com", "password": "wrong"},
    )
    assert resp.status_code == 401
