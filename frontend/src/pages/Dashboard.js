import React, { useState } from "react";

function Dashboard() {
  const [groups] = useState([]);

  return (
    <section>
      <h2>Your Groups</h2>
      {groups.length === 0 ? (
        <p>No groups yet. Create one to start tracking shared expenses.</p>
      ) : (
        <ul>
          {groups.map((g) => (
            <li key={g.id}>{g.name}</li>
          ))}
        </ul>
      )}
      <button>+ New Group</button>
    </section>
  );
}

export default Dashboard;
