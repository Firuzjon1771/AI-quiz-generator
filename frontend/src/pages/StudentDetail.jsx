import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/StudentDetail.css";
import StudentPerformanceChart from "../components/StudentPerformanceChart";
import StudentScoreChart from "../components/StudentScoreChart";
function formatShortDate(dateString) {
  const d = new Date(dateString);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function formatFullDate(dateString) {
  const d = new Date(dateString);
  return d.toLocaleString();
}

export default function StudentDetail({ studentId, onBack }) {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    axios
      .get(`/api/students/${studentId}`)
      .then((res) => {
        const quizzes = res.data.quizzes.map((q) => ({
          ...q,
          due_at: q.due_at || q.submitted_at || null,
          submitted_at: q.submitted_at || null,
        }));
        setStudent({ ...res.data, quizzes });
        setError("");
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load student data");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [studentId]);

  if (loading) return <p>Loading student details…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!student) return null;

  return (
    <div className="student-detail">
      <button className="back-button" onClick={onBack}>
        ◀ Back to Students
      </button>
      <div className="performance-container">
        <div className="student-info">
          <h2>{student.name}</h2>
          <div className="student-meta">
            <p>
              <strong>Email:</strong> {student.email}
            </p>
            <p>
              <strong>Class:</strong> {student.class}
            </p>
          </div>
        </div>

        <div className="student-chart">
          <h3>Performance Overview</h3>
          <StudentPerformanceChart quizzes={student.quizzes} />
        </div>
      </div>
      <h3>Scores by Quiz</h3>
      <StudentScoreChart quizzes={student.quizzes} />
      <h3>Quizzes</h3>
      {student.quizzes.length === 0 ? (
        <p>No quizzes assigned yet.</p>
      ) : (
        <table className="quiz-table">
          <thead>
            <tr>
              <th>Quiz</th>
              <th>Score</th>
              <th>Assigned</th>
              <th>Due</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {student.quizzes.map((q) => {
              const assignedTs = q.assigned ? new Date(q.assigned) : null;
              const dueTs = q.due_at ? new Date(q.due_at) : null;
              const submittedTs = q.submitted_at
                ? new Date(q.submitted_at)
                : null;

              let statusText;
              if (submittedTs) {
                statusText = "Submitted";
              } else {
                statusText =
                  dueTs && Date.now() > dueTs.getTime()
                    ? "Not submitted"
                    : "Pending";
              }

              return (
                <tr key={`${q.quiz_id}-${q.assigned}`}>
                  <td>{q.title}</td>
                  <td>{q.score != null ? q.score : "—"}</td>

                  <td>
                    <span className="date-cell">
                      {assignedTs ? formatShortDate(assignedTs) : "—"}
                      {assignedTs && (
                        <span className="tooltip">
                          {formatFullDate(assignedTs)}
                        </span>
                      )}
                    </span>
                  </td>

                  <td>
                    <span className="date-cell">
                      {dueTs ? formatShortDate(dueTs) : "—"}
                      {dueTs && (
                        <span className="tooltip">{formatFullDate(dueTs)}</span>
                      )}
                    </span>
                  </td>

                  <td
                    className={`status ${statusText
                      .toLowerCase()
                      .replace(/ /g, "-")}`}
                  >
                    {statusText}
                    {statusText === "Not submitted" && (
                      <span className="tooltip">Did not attend</span>
                    )}
                  </td>

                  <td>
                    <span className="date-cell">
                      {submittedTs ? formatShortDate(submittedTs) : "—"}
                      {submittedTs && (
                        <span className="tooltip">
                          {formatFullDate(submittedTs)}
                        </span>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
