import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/QuizTake.css";

export default function QuizTake({ studentId }) {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState({}); // { [qIdx]: "string" }
  const [timeLeft, setTimeLeft] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // Load quiz & assignment
  useEffect(() => {
    async function load() {
      try {
        const { data: all } = await axios.get(
          `/api/student/${studentId}/quizzes`
        );
        const found = all.find((a) => a.assignment_id === Number(assignmentId));
        if (!found) throw new Error("Assignment not found");

        const { data: quizJson } = await axios.get(
          `/api/quiz/${found.quiz_id}/json`
        );
        setQuiz({ ...found, questions: quizJson.questions });
        setTimeLeft(found.time_limit ?? 300);
      } catch (e) {
        setError(e.response?.data?.error || e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [studentId, assignmentId]);

  // Countdown timer
  useEffect(() => {
    if (!quiz || timedOut) return;
    if (timeLeft <= 0) {
      setTimedOut(true);
      alert("Time’s up! Auto-submitting…");
      doSubmit();
      return;
    }
    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, quiz, timedOut]);

  // Submit handler
  const doSubmit = async () => {
    clearTimeout(timerRef.current);
    setShowConfirm(false);

    try {
      const { data } = await axios.post(`/api/student/${studentId}/submit`, {
        quiz_id: quiz.quiz_id,
        assignment_id: quiz.assignment_id,
        answers, // map of strings
      });
      setResult({
        score: data.score,
        correct: data.correct,
        total: data.total,
      });
      setShowResultModal(true);
    } catch (e) {
      setError("Submit error: " + (e.response?.data?.error || e.message));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // how many answered?
    const answered = Object.keys(answers).filter(
      (k) => answers[k] !== undefined && answers[k] !== ""
    ).length;

    if (answered < quiz.questions.length) {
      setShowConfirm(true);
    } else {
      doSubmit();
    }
  };

  const closeAndBack = () => {
    setShowResultModal(false);
    navigate("/students", { replace: true });
  };

  // UI states
  if (loading) return <p>Loading…</p>;
  if (error) return <p className="error">{error}</p>;
  if (showResultModal && result) {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <h3>Your Score</h3>
          <p>
            You got <strong>{result.correct}</strong> out of{" "}
            <strong>{result.total}</strong> ({result.score}%)
          </p>
          <button className="btn primary" onClick={closeAndBack}>
            Close
          </button>
        </div>
      </div>
    );
  }

  // Clock hand angle
  const angle =
    (((quiz.time_limit ?? 10) - timeLeft) / (quiz.time_limit ?? 10)) * 360;

  return (
    <div className="quiz-take">
      <h2 className="quiz-title">{quiz.title}</h2>

      {/* Timer */}
      <div className="timer-fixed">
        <svg width="80" height="80" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="48"
            stroke="#CBD5E0"
            strokeWidth="2"
            fill="#F7FAFC"
          />
          {[...Array(12)].map((_, i) => (
            <line
              key={i}
              x1="50"
              y1="10"
              x2="50"
              y2="18"
              stroke="#4A5568"
              strokeWidth="2"
              transform={`rotate(${i * 30} 50 50)`}
            />
          ))}
          {[...Array(60)].map((_, i) => (
            <line
              key={i}
              x1="50"
              y1="10"
              x2="50"
              y2="14"
              stroke="#A0AEC0"
              strokeWidth="1"
              transform={`rotate(${i * 6} 50 50)`}
            />
          ))}
          <g
            className="clock-hand"
            style={{
              transform: `rotate(${angle}deg)`,
              transformBox: "view-box",
              transformOrigin: "50px 50px",
            }}
          >
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="15"
              stroke="#E53E3E"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
          <circle cx="50" cy="50" r="2" fill="#4A5568" />
        </svg>
        <div className="digital-clock">{timeLeft}s</div>
      </div>

      {/* Quiz Form */}
      <form className="quiz-form" onSubmit={handleSubmit}>
        {quiz.questions.map((q, idx) => {
          // detect question type
          const isArrayQ = Array.isArray(q);
          const isMC = q.type === "mc";
          let questionText,
            options = [];

          if (isArrayQ) {
            questionText = q[0];
          } else if (isMC) {
            questionText = q.question;
            options = q.options;
          } else {
            questionText = q.question;
          }

          return (
            <div key={idx} className="question-block">
              <p>
                <strong>Q{idx + 1}:</strong> {questionText}
              </p>

              {isMC ? (
                <div className="mc-options">
                  {options.map((opt, i) => {
                    const val = typeof opt === "string" ? opt : opt.text;
                    const checked = answers[idx] === val;
                    return (
                      <label key={i} className="radio-option">
                        <input
                          type="checkbox"
                          name={`q${idx}-${i}`}
                          value={val}
                          checked={checked}
                          onChange={(e) => {
                            const { checked, value } = e.target;
                            setAnswers((prev) => {
                              if (checked) {
                                // store as a single string
                                return { ...prev, [idx]: value };
                              } else {
                                // remove it
                                const { [idx]: _, ...rest } = prev;
                                return rest;
                              }
                            });
                          }}
                        />
                        <div className="option-label">
                          <strong>{String.fromCharCode(65 + i)}.</strong> {val}
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                // open / text question
                <input
                  type="text"
                  value={answers[idx] || ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [idx]: e.target.value,
                    }))
                  }
                />
              )}
            </div>
          );
        })}

        <button type="submit" className="btn primary submit-btn">
          Submit Quiz
        </button>
      </form>

      {/* confirmation for unanswered */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <p>You haven’t answered all questions. Submit anyway?</p>
            <button className="btn primary" onClick={doSubmit}>
              Yes, submit
            </button>
            <button
              className="btn secondary"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
