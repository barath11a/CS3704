import React from "react";
import { useParams } from "react-router-dom";

function GroupView() {
  const { groupId } = useParams();

  return (
    <section>
      <h2>Group {groupId}</h2>
      <p>Expense list, balances, and receipt scanner will go here.</p>
    </section>
  );
}

export default GroupView;
