from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import or_

from models import db
from models.group import Group, GroupMember

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
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    Group.query.get_or_404(group_id)
    db.session.add(GroupMember(group_id=group_id, user_id=user_id))
    db.session.commit()
    return jsonify({"status": "added"}), 201
