from datetime import datetime

from . import db


class Expense(db.Model):
    __tablename__ = "expenses"

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey("groups.id"), nullable=False)
    payer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(64), default="uncategorized")
    split_method = db.Column(db.String(16), default="equal")  # equal | custom | percent
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    shares = db.relationship("ExpenseShare", backref="expense", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "group_id": self.group_id,
            "payer_id": self.payer_id,
            "description": self.description,
            "amount": self.amount,
            "category": self.category,
            "split_method": self.split_method,
            "shares": [s.to_dict() for s in self.shares],
        }


class ExpenseShare(db.Model):
    __tablename__ = "expense_shares"

    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey("expenses.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    amount_owed = db.Column(db.Float, nullable=False)
    settled = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            "user_id": self.user_id,
            "amount_owed": self.amount_owed,
            "settled": self.settled,
        }
