import React from "react";

const QuestionDisplay = ({ questions, approved, setApproved }) => {
  const toggleApproval = (qa) => {
    const exists = approved.find(
      (item) => item[0] === qa[0] && item[1] === qa[1]
    );
    if (exists) {
      setApproved(approved.filter((item) => item[0] !== qa[0]));
    } else {
      setApproved([...approved, qa]);
    }
  };

  return (
    <div>
      <h4>Generated Questions</h4>
      {questions.length === 0 ? (
        <p>No questions generated</p>
      ) : (
        <ul>
          {questions.map(([q, a], idx) => (
            <li key={idx}>
              <strong>Q:</strong> {q}
              <br />
              <strong>A:</strong> {a}
              <br />
              <button onClick={() => toggleApproval([q, a])}>
                {approved.find((item) => item[0] === q)
                  ? "Unapprove"
                  : "Approve"}
              </button>
              <hr />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default QuestionDisplay;
