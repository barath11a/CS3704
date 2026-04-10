Contributor: Vedanth Achanta

What was implemented: 
I implemented the get_all_expenses() function that was previously causing a 404 error as the api lacked a way toget all expenses in the system. I also updated the input validation logic in the add_expense route to make sure that required fields liek group id and amount are properly validated before we process.

How it was implemented:
 This was implemented without the use of AI. I used Blueprint (Flask) routing system and Expense.query.all() from SQLAlchemy to interact with the database. Furthermore I wrote conditional checks to returna  400 error (Bad Request) if the JSON payloads are missing required keys.

How it related to overall design: 
This corresponds to the Data Retrieval aspect of our project from PM3 design. Our design relies on a centeralized API to serve data to the frontend. By using GET metho I have enabled the "Expense History" module of our system to function. 

Contributor: Barath Muthukirshnan

What was implemented:
I established the foundational repository directory structure separating the React frontend, Flask backend, and system documentation. Additionally, I designed and authored the Black Box Test Plan consisting of 10 unique test cases mapping back to acceptance criteria.

AI Tool Use: Copilot

Prompt: "Generate a standard folder structure for a monorepo containing a Flask API backend and a React frontend."
Prompt: "Create a markdown table for 10 black box test cases for a shared group expense tracker including columns for Test ID, Description, Expected Result, and Actual Result."

AI Explanation and Modification: 
Copilot successfully outputted standard MVC and Blueprint patterns for the project structure and a well-formatted table for the test plan. I had to modify the generated test cases significantly to directly match our specific project requirements and design constraints outlined in PM2 and PM3.

How it related to overall design:
This relates directly to our PM3 design and constraints. Setting up the file architecture ensures that the team can safely scale features without messy merge conflicts, and the black box test cases ensure we verify the functional requirements of our system.


Contributor: Ronit Mehta

What was implemented: 
I built the logic that calculates live balances for each user based on shared split metrics. I also stood up a JWT-protected GET endpoint for secure data fetching and designed a Reminder Banner UI to notify users of outstanding payments.

AI Tool Used: GitHub Copilot

Prompt: "Write a python function to compute live balances for users in a group based on expenses."
"How to protect a Flask route using a real JWT token instead of a stub."

AI Explanation and Modification: 

Copilot provided standard iteration logic to crunch the expense amounts. However, it generated a generic get_jwt_identity() function that did not match our database model. I manually refactored the generated script to correctly extract user profiles and pull dynamic math from our active SQL tables.

How it related to overall design

This aligns perfectly with the automated gentle reminders and real-time balances listed as core capabilities in our PM3 architecture. Without secure JWT fetches and live math computation, the application would fail to serve its main purpose.
























Note: Gemini model was used to assist in writing for this file.