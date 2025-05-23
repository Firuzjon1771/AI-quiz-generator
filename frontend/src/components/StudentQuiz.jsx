import React, { useEffect, useState } from "react";
import axios from "axios";
import "../styles/StudentQuiz.css";
import { useNavigate } from "react-router-dom";

export default function StudentQuiz({ studentId }) {
  const [assigned, setAssigned] = useState([]);
  const [submitted, setSubmitted] = useState([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`/api/student/${studentId}/quizzes`)
      .then((res) => {
        const all = res.data;
        setAssigned(all.filter((q) => q.status === "assigned"));
        setSubmitted(all.filter((q) => q.status === "completed"));
      })
      .catch(console.error);
  }, [studentId]);

  const handleJoinByCode = async () => {
    const clean = code.trim().toUpperCase();
    if (!clean) {
      setError("Please enter a quiz code");
      return;
    }
    try {
      await axios.post("/api/quiz/join", {
        code: clean,
        student_id: studentId,
      });
      window.location.reload();
    } catch (err) {
      setError(
        err.response?.status === 404
          ? "Quiz code not found."
          : "Server error—please try again."
      );
    }
  };

  return (
    <div className="student-quiz">
      <h2>Your Assigned Quizzes</h2>

      <div className="join-panel">
        <input
          placeholder="Enter quiz code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setError("");
          }}
        />
        <button onClick={handleJoinByCode}>Assign to Quiz</button>
      </div>
      {error && <p className="error-text">{error}</p>}

      {assigned.length === 0 ? (
        <p>No quizzes assigned yet.</p>
      ) : (
        <div className="quiz-list">
          {assigned.map((q) => (
            <div key={q.assignment_id} className="quiz-card">
              <h3>{q.title}</h3>
              <p>Topic: {q.topic}</p>
              <button
                className="btn primary"
                onClick={() => navigate(`/quiz/take/${q.assignment_id}`)}
              >
                Start Quiz
              </button>
            </div>
          ))}
        </div>
      )}

      {submitted.length > 0 && (
        <>
          <h2>Your Completed Quizzes</h2>
          <div className="quiz-list">
            {submitted.map((q) => (
              <div key={q.assignment_id} className="quiz-card completed">
                <h3>{q.title}</h3>
                <p className="score">Score: {q.score}</p>
                <p>Submitted: {new Date(q.submitted_at).toLocaleString()}</p>
                <button
                  className="btn preview-btn"
                  onClick={() => navigate(`/quiz/result/${q.assignment_id}`)}
                >
                  Preview
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
