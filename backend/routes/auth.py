from flask import Blueprint, jsonify, request

from models import db
from models.user import User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not (name and email and password):
        return jsonify({"error": "name, email, and password required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email already registered"}), 409

    # TODO: replace with a proper password hash (e.g., werkzeug or bcrypt)
    user = User(name=name, email=email, password_hash=password)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if not user or user.password_hash != password:
        return jsonify({"error": "invalid credentials"}), 401

    # TODO: return a JWT token
    return jsonify({"user": user.to_dict(), "token": "stub-token"})
