import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/QuizResult.css";

export default function QuizResult() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    axios
      .get(`/api/assignment/${assignmentId}/result`)
      .then((res) => setQuiz(res.data))
      .catch((err) =>
        setError(
          err.response?.data?.error || err.message || "Failed to load result"
        )
      )
      .finally(() => setLoading(false));
  }, [assignmentId]);

  if (loading) return <p>Loading…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!quiz) return null;

  const { questions, answers, title, score } = quiz || {};
  const hasAnswers =
    answers && typeof answers === "object" && Object.keys(answers).length > 0;

  function getCorrectAnswer(q) {
    if (Array.isArray(q) && q.length > 1) return q[1];
    if (q.answer !== undefined) return q.answer;
    return "";
  }
  function getStudentAnswer(idx) {
    return answers && answers[idx] !== undefined ? answers[idx] : "";
  }
  function isCorrect(idx, q) {
    const correct = getCorrectAnswer(q);
    return (
      String(getStudentAnswer(idx)).trim().toLowerCase() ===
      String(correct).trim().toLowerCase()
    );
  }

  return (
    <div className="student-quiz result-view">
      <h2 style={{ marginBottom: 8 }}>
        {title}{" "}
        {hasAnswers && (
          <span style={{ fontSize: 22, color: "#22577a" }}>Score: {score}</span>
        )}
      </h2>
      <button
        className="btn preview-btn"
        style={{ marginBottom: 12 }}
        onClick={() => navigate(-1)}
      >
        Back
      </button>
      <div className="quiz-list">
        {questions.map((q, idx) => {
          const questionText = Array.isArray(q)
            ? q[0]
            : q.type === "mc"
            ? q.question
            : q.question;
          const isMC = q.type === "mc";
          const options = isMC ? q.options : [];
          const correctAnswer = getCorrectAnswer(q);

          if (!hasAnswers) {
            return (
              <div
                key={idx}
                className="quiz-card"
                style={{ borderLeft: "4px solid #cbd5e1" }}
              >
                <p>
                  <strong>Q{idx + 1}:</strong> {questionText}
                </p>
                {isMC ? (
                  <div>
                    {options.map((opt, i) => {
                      const val = typeof opt === "string" ? opt : opt.text;
                      return (
                        <div key={i} className="mc-option-disabled">
                          <input type="checkbox" disabled readOnly />
                          <span>
                            <strong>{String.fromCharCode(65 + i)}.</strong>{" "}
                            {val}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    value=""
                    disabled
                    readOnly
                    style={{ background: "#f8f9fa" }}
                  />
                )}
                <div className="correct-label" style={{ color: "#334e68" }}>
                  Correct answer: <b>{correctAnswer}</b>
                </div>
              </div>
            );
          }

          const studentAnswer = getStudentAnswer(idx);
          const correct = isCorrect(idx, q);

          let cardClass = "quiz-card";
          if (correct) cardClass += " correct";
          else cardClass += " incorrect";

          return (
            <div key={idx} className={cardClass}>
              <p>
                <strong>Q{idx + 1}:</strong> {questionText}
              </p>
              {isMC ? (
                <div>
                  {options.map((opt, i) => {
                    const val = typeof opt === "string" ? opt : opt.text;
                    const checked = studentAnswer === val;
                    // Show which answer student picked by checkbox
                    return (
                      <div key={i} className="mc-option-disabled">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled
                          readOnly
                        />
                        <span>
                          <strong>{String.fromCharCode(65 + i)}.</strong> {val}
                          {checked && (
                            <span
                              style={{
                                fontWeight: "bold",
                                color: correct ? "#14b75a" : "#ea4d3d",
                                marginLeft: "0.5em",
                                fontSize: "0.97em",
                              }}
                            >
                              {correct
                                ? " (Your answer ✔)"
                                : " (Your answer ✘)"}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ marginTop: 8, marginBottom: 2 }}>
                  <input
                    type="text"
                    value={studentAnswer}
                    disabled
                    readOnly
                    style={{
                      background: "#f8f9fa",
                      border:
                        !correct && studentAnswer
                          ? "2px solid #ff6464"
                          : "1.5px solid #b8c9e4",
                      color: !correct && studentAnswer ? "#c90d0d" : "#222",
                      fontWeight: studentAnswer ? 600 : 400,
                    }}
                  />
                  <span
                    style={{
                      marginLeft: "0.8em",
                      fontWeight: 600,
                      color: correct ? "#14b75a" : "#ea4d3d",
                    }}
                  >
                    {studentAnswer &&
                      (correct ? "(Your answer ✔)" : "(Your answer ✘)")}
                  </span>
                </div>
              )}
              {!correct && (
                <div className="correct-label">
                  Correct answer: <b>{correctAnswer}</b>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
