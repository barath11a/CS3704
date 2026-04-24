"""Shared pytest fixtures for PM4 unit/integration tests.

Tests in this directory cover the PM4 implementation contributions:
  - Vedanth Achanta: get_all_expenses route + add_expense input validation
  - Ronit Mehta: live balance computation (compute_group_balances) + JWT-protected reminders
  - Haradeep Puneti: hashed-password register/login + JWT-protected list/create groups
  - Amanjeet Sahagal: net balance summary on group view (uses compute_group_balances)
  - Harin Kellampalli: timestamps surfaced via existing model fields
  - Barath Muthukrishnan: repository structure + black-box plan (no runtime code)

AI use note (course AI policy):
  These tests were authored with assistance from Claude (Anthropic) using the
  prompt: "Generate unit tests for the function(s) implemented for PM4 (at
  least one unit test per function, and at least one integration test
  incorporating multiple functions working together)." Each test file calls
  out which assertions were AI-generated vs. human-edited. The test logic
  was reviewed against the actual implementation in routes/ and services/.
"""

import sys
from pathlib import Path

# Make the backend package importable when pytest is run from the backend dir.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from flask_jwt_extended import create_access_token

from app import create_app
from models import db
from models.user import User
from werkzeug.security import generate_password_hash


class TestConfig:
    TESTING = True
    SECRET_KEY = "test-secret"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = "test-jwt-secret"


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.drop_all()
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def user_factory(app):
    """Create a user with a hashed password and return (user_id, token, email, password)."""
    counter = {"i": 0}

    def _make(name=None, email=None, password="hunter2"):
        counter["i"] += 1
        i = counter["i"]
        u = User(
            name=name or f"User{i}",
            email=email or f"user{i}@example.com",
            password_hash=generate_password_hash(password),
        )
        db.session.add(u)
        db.session.commit()
        token = create_access_token(identity=str(u.id))
        return u, token, password

    return _make


@pytest.fixture
def auth_header(user_factory):
    user, token, _ = user_factory()
    return user, {"Authorization": f"Bearer {token}"}
