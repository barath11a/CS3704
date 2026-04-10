# IGES - Requirements

## User Stories

### Group Member
1. As a group member, I want to record an expense I paid for so the group knows what I'm owed.
2. As a group member, I want to see what I currently owe and am owed in each group.

### Group Organizer
3. As an organizer, I want to create a group and invite members.
4. As an organizer, I want a simplified settlement plan that minimizes transfers.

## Functional Requirements
- FR1: Create groups and invite members
- FR2: Add expenses with equal, custom, or percentage splits
- FR3: Automatic expense categorization by keyword
- FR4: Real-time balance updates per group
- FR5: Receipt scanning (OCR) to extract totals
- FR6: Gentle automated reminders for outstanding balances
- FR7: Debt simplification to minimize the number of payments

## Non-Functional Requirements
- Performance: balance recalculation < 200ms for groups up to 50 members
- Availability: target 99% uptime
- Security: hashed passwords, JWT auth, HTTPS in production
- Maintainability: modular services, documented API
- Portability: web-first, mobile-friendly responsive UI
