from flask import Blueprint, jsonify, request

from models import db
from models.expense import Expense, ExpenseShare
from services.split_service import compute_split
from services.ocr_service import extract_receipt_total

expenses_bp = Blueprint("expenses", __name__)


@expenses_bp.route("/", methods=["POST"])
def add_expense():
    data = request.get_json() or {}
    group_id = data.get("group_id")
    payer_id = data.get("payer_id")
    description = data.get("description")
    amount = data.get("amount")
    split_method = data.get("split_method", "equal")
    participants = data.get("participants", [])  # list of user_ids
    custom_shares = data.get("custom_shares")    # {user_id: amount}


    if group_id is None or payer_id is None or description is None or amount is None:
        return jsonify({"error": "missing required fields"}), 400

    if not isinstance(participants, list) or len(participants) == 0:
        return jsonify({"error": "participants must be a non-empty list"}), 400

    shares = compute_split(amount, participants, split_method, custom_shares)

    expense = Expense(
        group_id=group_id,
        payer_id=payer_id,
        description=description,
        amount=amount,
        split_method=split_method,
    )
    db.session.add(expense)
    db.session.flush()

    for user_id, owed in shares.items():
        db.session.add(ExpenseShare(expense_id=expense.id, user_id=user_id, amount_owed=owed))

    db.session.commit()
    return jsonify(expense.to_dict()), 201


@expenses_bp.route("/scan", methods=["POST"])
def scan_receipt():
    if "image" not in request.files:
        return jsonify({"error": "image file required"}), 400
    image = request.files["image"]
    total = extract_receipt_total(image.stream)
    return jsonify({"detected_total": total})


@expenses_bp.route("/group/<int:group_id>", methods=["GET"])
def list_group_expenses(group_id):
    items = Expense.query.filter_by(group_id=group_id).all()
    return jsonify([e.to_dict() for e in items])
#fixed routing for the GET method
@expenses_bp.route("/", methods=["GET"])
def get_all_expenses():
    items = Expense.query.all()
    return jsonify([e.to_dict() for e in items])