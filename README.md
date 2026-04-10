# Intelligent Group Expense Splitter (IGES)

Simplifying Shared Expenses Through Intelligent Automation

## Overview

IGES is a smart expense tracker that automates expense tracking and balance
calculations for groups (roommates, travel groups, dinners). It supports:

- Group creation and member invitations
- Equal and customizable expense splits
- Real-time balance updates
- Receipt scanning via OCR (Tesseract)
- Automated gentle reminders for outstanding payments
- Automatic expense categorization

## Team

- Ronit Mehta
- Harin Kellampalli
- Barath Muthukrishnan
- Haradeep Puneti
- Vedanth Achanta
- Amanjeet Sahagal

## Tech Stack

- **Backend:** Python 3 + Flask + SQLAlchemy + Tesseract (via pytesseract)
- **Frontend:** React
- **Database:** SQLite (dev), PostgreSQL (prod target)
- **Process:** Scrum, 2-week sprints

## Project Structure

```
IntelligentGroupExpenseSplitter/
├── backend/         Flask API server
├── frontend/        React client
└── docs/            Requirements, architecture, sprint notes
```

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm start
```
