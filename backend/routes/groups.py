from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import or_

from models import db
from models.group import Group, GroupMember
from models.user import User

groups_bp = Blueprint("groups", __name__)


@groups_bp.route("", methods=["GET"])
@jwt_required()
def list_groups():
    user_id = int(get_jwt_identity())
    member_subq = db.session.query(GroupMember.group_id).filter_by(user_id=user_id)
    groups = (
        Group.query.filter(
            or_(Group.owner_id == user_id, Group.id.in_(member_subq))
        )
        .order_by(Group.created_at.desc())
        .all()
    )
    return jsonify([g.to_dict() for g in groups])


@groups_bp.route("", methods=["POST"])
@jwt_required()
def create_group():
    data = request.get_json() or {}
    name = data.get("name")
    owner_id = int(get_jwt_identity())

    if not name:
        return jsonify({"error": "name required"}), 400

    group = Group(name=name, owner_id=owner_id)
    db.session.add(group)
    db.session.flush()
    db.session.add(GroupMember(group_id=group.id, user_id=owner_id))
    db.session.commit()
    return jsonify(group.to_dict()), 201


@groups_bp.route("/<int:group_id>", methods=["GET"])
def get_group(group_id):
    group = Group.query.get_or_404(group_id)
    return jsonify(group.to_dict())


@groups_bp.route("/<int:group_id>/members", methods=["POST"])
def add_member(group_id):
    data = request.get_json() or {}
    user_id = data.get("user_id")
    email = (data.get("email") or "").strip().lower()

    if not user_id and not email:
        return jsonify({"error": "user_id or email required"}), 400

    Group.query.get_or_404(group_id)

    user = None
    if user_id:
        user = User.query.get(user_id)
    elif email:
        user = User.query.filter(db.func.lower(User.email) == email).first()

    if not user:
        return jsonify({"error": "no user found with that email"}), 404

    existing = GroupMember.query.filter_by(
        group_id=group_id, user_id=user.id
    ).first()
    if existing:
        return jsonify({"error": "user is already a member"}), 409

    db.session.add(GroupMember(group_id=group_id, user_id=user.id))
    db.session.commit()
    return jsonify({"status": "added", "user": user.to_dict()}), 201
