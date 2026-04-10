from flask import Blueprint, jsonify, request

from models import db
from models.group import Group, GroupMember

groups_bp = Blueprint("groups", __name__)


@groups_bp.route("", methods=["POST"])
def create_group():
    data = request.get_json() or {}
    name = data.get("name")
    owner_id = data.get("owner_id")

    if not (name and owner_id):
        return jsonify({"error": "name and owner_id required"}), 400

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
