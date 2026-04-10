# IGES - Architecture

## Components

```
+-------------------+        +--------------------+
|  React Frontend   | <----> |   Flask REST API   |
+-------------------+        +--------------------+
                                      |
                                      v
                             +--------------------+
                             |  SQLite / Postgres |
                             +--------------------+
                                      |
                                      v
                             +--------------------+
                             | Tesseract OCR      |
                             +--------------------+
```

## Backend Modules
- `models/` - SQLAlchemy ORM (User, Group, GroupMember, Expense, ExpenseShare)
- `routes/` - Blueprints for auth, groups, expenses
- `services/split_service.py` - split computation + debt simplification
- `services/ocr_service.py` - receipt total extraction + categorization

## Key Flows
1. **Add Expense:** payer → POST /api/expenses → split_service → DB → updated balances
2. **Scan Receipt:** user uploads image → POST /api/expenses/scan → pytesseract → extracted total
3. **Settle:** GET /api/groups/:id/settle → simplify_debts → list of transfers

## Process Model
- Scrum, 2-week sprints
- Sprint 1: auth + groups + basic expense CRUD
- Sprint 2: equal/custom splits + balances
- Sprint 3: OCR receipt scanning + categorization
- Sprint 4: reminders + debt simplification + polish
