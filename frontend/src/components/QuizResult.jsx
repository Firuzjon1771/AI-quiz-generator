import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/QuizTake.css";

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

  const { questions, answers, title, score } = quiz;

  const getStudentAnswer = (idx) =>
    answers[idx] !== undefined ? answers[idx] : "";

  function isCorrect(idx, q) {
    let correct;
    if (Array.isArray(q) && q.length > 1) correct = q[1];
    else if (q.answer !== undefined) correct = q.answer;
    else correct = "";
    return (
      String(getStudentAnswer(idx)).trim().toLowerCase() ===
      String(correct).trim().toLowerCase()
    );
  }

  function getCorrectAnswer(q) {
    if (Array.isArray(q) && q.length > 1) return q[1];
    if (q.answer !== undefined) return q.answer;
    return "";
  }

  return (
    <div className="quiz-take result-view">
      <h2 className="quiz-title">
        {title} <span className="score-label">Score: {score}</span>
      </h2>
      <button
        className="btn primary"
        style={{ marginBottom: 18 }}
        onClick={() => navigate(-1)}
      >
        Back
      </button>
      <form className="quiz-form" onSubmit={(e) => e.preventDefault()}>
        {questions.map((q, idx) => {
          const studentAnswer = getStudentAnswer(idx);
          const correct = isCorrect(idx, q);
          const correctAnswer = getCorrectAnswer(q);

          // highlighting
          let qClass = correct
            ? "question-block correct-answer"
            : "question-block incorrect-answer";
          let questionText,
            options = [];
          const isMC = q.type === "mc";
          if (Array.isArray(q)) questionText = q[0];
          else if (isMC) {
            questionText = q.question;
            options = q.options;
          } else questionText = q.question;

          return (
            <div key={idx} className={qClass}>
              <p>
                <strong>Q{idx + 1}:</strong> {questionText}
              </p>
              {isMC ? (
                <div className="mc-options">
                  {options.map((opt, i) => {
                    const val = typeof opt === "string" ? opt : opt.text;
                    const checked = studentAnswer === val;
                    return (
                      <label key={i} className="radio-option">
                        <input
                          type="checkbox"
                          name={`q${idx}-${i}`}
                          value={val}
                          checked={checked}
                          disabled
                          readOnly
                        />
                        <div className="option-label">
                          <strong>{String.fromCharCode(65 + i)}.</strong> {val}
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="text"
                  value={studentAnswer}
                  disabled
                  readOnly
                  style={{ background: "#f8f9fa" }}
                />
              )}
              {!correct && (
                <div className="correct-label">
                  <span>
                    Correct answer: <b>{correctAnswer}</b>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </form>
    </div>
  );
}
