import React from "react";
import "../styles/QuestionList.css";

const QuestionList = ({ questions }) => (
  <div className="question-list">
    <h3 className="ql-heading">Generated Questions</h3>
    <ul className="ql-list">
      {questions.map((qa, index) => (
        <li key={index} className="ql-item">
          <p>
            <strong>Q:</strong> {qa[0]}
          </p>
          <p>
            <strong>A:</strong> {qa[1]}
          </p>
        </li>
      ))}
    </ul>
  </div>
);

export default QuestionList;
