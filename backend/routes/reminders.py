from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import or_
from sqlalchemy.orm import selectinload

from models import db
from models.expense import Expense
from models.group import Group, GroupMember
from services.balance_service import compute_group_balances

reminders_bp = Blueprint("reminders", __name__)

_MIN = 0.01


def _user_group_ids(user_id: int):
    member_subq = db.session.query(GroupMember.group_id).filter_by(user_id=user_id)
    return (
        db.session.query(Group.id)
        .filter(or_(Group.owner_id == user_id, Group.id.in_(member_subq)))
        .all()
    )


@reminders_bp.route("", methods=["GET"])
@jwt_required()
def list_reminders():
    user_id = int(get_jwt_identity())
    group_rows = _user_group_ids(user_id)
    group_ids = [r[0] for r in group_rows]

    items = []
    for gid in group_ids:
        group = Group.query.get(gid)
        if not group:
            continue
        expenses = (
            Expense.query.filter_by(group_id=gid)
            .options(selectinload(Expense.shares))
            .order_by(Expense.created_at.desc())
            .all()
        )
        if not expenses:
            continue
        balances = compute_group_balances(expenses)
        bal = balances.get(user_id, 0.0)
        if bal <= -_MIN:
            items.append(
                {
                    "group_id": group.id,
                    "group_name": group.name,
                    "kind": "you_owe",
                    "amount": round(-bal, 2),
                    "message": f'In “{group.name}”, you still owe about ${-bal:.2f} overall.',
                }
            )
        elif bal >= _MIN:
            items.append(
                {
                    "group_id": group.id,
                    "group_name": group.name,
                    "kind": "owed_to_you",
                    "amount": round(bal, 2),
                    "message": f'In “{group.name}”, the group still owes you about ${bal:.2f} overall.',
                }
            )

    owe_first = [i for i in items if i["kind"] == "you_owe"]
    credit = [i for i in items if i["kind"] == "owed_to_you"]
    ordered = owe_first + credit

    return jsonify({"items": ordered})
