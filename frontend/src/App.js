import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import GroupView from "./pages/GroupView";
import Login from "./pages/Login";

function App() {
  return (
    <div className="container">
      <header>
        <h1>Intelligent Group Expense Splitter</h1>
        <nav>
          <Link to="/">Dashboard</Link> | <Link to="/login">Login</Link>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/groups/:groupId" element={<GroupView />} />
      </Routes>
    </div>
  );
}

export default App;
