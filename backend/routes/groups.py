from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import or_
from sqlalchemy import func

from models import db
from models.group import Group, GroupMember
from models.user import User

groups_bp = Blueprint("groups", __name__)


def _normalize_user_ids(raw_ids):
    if raw_ids is None:
        return []
    if not isinstance(raw_ids, list):
        raise ValueError("member_ids must be a list")

    normalized = []
    seen = set()
    for raw in raw_ids:
        try:
            user_id = int(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError("member_ids must contain valid user ids") from exc
        if user_id not in seen:
            seen.add(user_id)
            normalized.append(user_id)
    return normalized


def _normalize_member_names(raw_names):
    if raw_names is None:
        return []
    if not isinstance(raw_names, list):
        raise ValueError("member_names must be a list")

    normalized = []
    seen = set()
    for raw in raw_names:
        if not isinstance(raw, str):
            raise ValueError("member_names must contain valid names")
        name = raw.strip()
        if not name:
            continue
        key = name.casefold()
        if key not in seen:
            seen.add(key)
            normalized.append(name)
    return normalized


def _missing_user_ids(user_ids):
    if not user_ids:
        return []
    rows = User.query.filter(User.id.in_(user_ids)).all()
    found = {row.id for row in rows}
    return [user_id for user_id in user_ids if user_id not in found]


def _resolve_member_names(names):
    resolved_ids = []
    for name in names:
        rows = User.query.filter(func.lower(User.name) == name.lower()).all()
        if not rows:
            raise ValueError(f'no user found with name "{name}"')
        if len(rows) > 1:
            raise ValueError(f'multiple users found with name "{name}"')
        resolved_ids.append(rows[0].id)
    return resolved_ids


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
    member_ids = data.get("member_ids", [])
    member_names = data.get("member_names", [])

    if not name:
        return jsonify({"error": "name required"}), 400
    try:
        extra_member_ids = _normalize_user_ids(member_ids)
        extra_member_names = _normalize_member_names(member_names)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    try:
        extra_member_ids.extend(_resolve_member_names(extra_member_names))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    all_member_ids = [owner_id, *[user_id for user_id in extra_member_ids if user_id != owner_id]]
    missing_ids = _missing_user_ids(all_member_ids)
    if missing_ids:
        return jsonify({"error": f"unknown user ids: {', '.join(str(i) for i in missing_ids)}"}), 400

    group = Group(name=name, owner_id=owner_id)
    db.session.add(group)
    db.session.flush()
    for user_id in all_member_ids:
        db.session.add(GroupMember(group_id=group.id, user_id=user_id))
    db.session.commit()
    return jsonify(group.to_dict()), 201


@groups_bp.route("/<int:group_id>", methods=["GET"])
def get_group(group_id):
    group = Group.query.get_or_404(group_id)
    return jsonify(group.to_dict())


@groups_bp.route("/<int:group_id>/members", methods=["POST"])
@jwt_required()
def add_member(group_id):
    data = request.get_json() or {}
    user_id = data.get("user_id")
    user_ids = data.get("user_ids")
    member_names = data.get("member_names")

    if user_ids is None and member_names is None:
        if user_id is None:
            return jsonify({"error": "user_id, user_ids, or member_names required"}), 400
        user_ids = [user_id]

    try:
        normalized_ids = _normalize_user_ids(user_ids)
        normalized_names = _normalize_member_names(member_names)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    try:
        normalized_ids.extend(_resolve_member_names(normalized_names))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    missing_ids = _missing_user_ids(normalized_ids)
    if missing_ids:
        return jsonify({"error": f"unknown user ids: {', '.join(str(i) for i in missing_ids)}"}), 400

    group = Group.query.get_or_404(group_id)
    existing_ids = {member.user_id for member in group.members}
    added = []
    for member_id in normalized_ids:
        if member_id in existing_ids:
            continue
        db.session.add(GroupMember(group_id=group_id, user_id=member_id))
        existing_ids.add(member_id)
        added.append(member_id)
    db.session.commit()
    return jsonify({"status": "added", "added_user_ids": added}), 201
