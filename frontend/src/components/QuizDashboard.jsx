import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/QuizDashboard.css";

const CLASS_OPTIONS = ["A", "B", "C", "D"];

export default function QuizDashboard({ onEdit }) {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedQuizForStudent, setSelectedQuizForStudent] = useState(null);
  const [selectedQuizForClass, setSelectedQuizForClass] = useState(null);
  const [modalStudentId, setModalStudentId] = useState("");
  const [modalClassId, setModalClassId] = useState("");
  const [copyStatus, setCopyStatus] = useState({});
  const [notification, setNotification] = useState("");
  const [modalStudentError, setModalStudentError] = useState("");
  const [modalDueAt, setModalDueAt] = useState("");
  const [tab, setTab] = useState("active");
  const [activeQs, setActiveQs] = useState([]);
  const [inactiveQs, setInactiveQs] = useState([]);
  const [modalTimeLimit, setModalTimeLimit] = useState("");
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(""), 3000);
  };

  useEffect(() => {
    fetchLists();
  }, [tab]);

  const fetchLists = async () => {
    try {
      const [actRes, inactRes] = await Promise.all([
        axios.get("/api/quizzes?active=1"),
        axios.get("/api/quizzes?active=0"),
      ]);
      setActiveQs(actRes.data);
      setInactiveQs(inactRes.data);
    } catch (err) {
      console.error("Failed to fetch quizzes:", err);
    }
  };

  const toggleActive = async (quizId, makeActive) => {
    try {
      await axios.post(
        `/api/quiz/${quizId}/${makeActive ? "activate" : "deactivate"}`
      );
      showToast(`Quiz ${makeActive ? "activated" : "deactivated"}`);
      fetchLists();
    } catch (err) {
      console.error(err);
      showToast("Operation failed");
    }
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleString("en-GB", {
      timeZone: "Europe/Bratislava",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const handleExport = (id, type) => {
    window.open(`http://localhost:5000/api/quiz/${id}/${type}`);
  };

  const openStudentModal = (quizId) => {
    setModalStudentError("");
    setModalDueAt("");
    setModalTimeLimit("");
    setModalStudentId("");
    setSelectedQuizForStudent(quizId);
    setShowStudentModal(true);

    setLoadingStudents(true);
    axios
      .get("/api/students")
      .then((res) => {
        setStudents(res.data);
        setLoadingStudents(false);
      })
      .catch(() => {
        setStudents([]);
        setLoadingStudents(false);
        setModalStudentError("Failed to load student list.");
      });
  };
  const closeStudentModal = () => {
    setModalDueAt("");
    setModalStudentError("");
    setShowStudentModal(false);
  };
  const confirmAssignStudent = async () => {
    const id = modalStudentId;
    if (!id) {
      setModalStudentError("Please select a student.");
      return;
    }
    setModalStudentError("");
    try {
      await axios.post("/api/quiz/assign", {
        quiz_id: selectedQuizForStudent,
        student_id: id,
        due_at: modalDueAt,
        time_limit: Number(modalTimeLimit) * 60,
      });
      showToast(`Assigned to student`);
      closeStudentModal();
    } catch {
      showToast("Assignment failed");
    }
  };

  const openClassModal = (quiz) => {
    setModalDueAt("");
    setSelectedQuizForClass(quiz);
    setModalClassId("");
    setModalTimeLimit("");
    setShowClassModal(true);
  };
  const closeClassModal = () => {
    setModalDueAt("");
    setShowClassModal(false);
    setSelectedQuizForClass(null);
  };
  const confirmAssignClass = async () => {
    if (!modalClassId) {
      showToast("Select a class first.");
      return;
    }
    try {
      await axios.post("/api/quiz/assign/class", {
        quiz_id: selectedQuizForClass.id,
        class_id: modalClassId,
        due_at: modalDueAt,
        time_limit: Number(modalTimeLimit) * 60,
      });
      showToast(
        `Quiz ${selectedQuizForClass.title} assigned to class ${modalClassId}`
      );
      closeClassModal();
    } catch (err) {
      console.error(err);
      showToast("Failed to assign quiz to class.");
    }
  };

  const handleCopyCode = (code, quizId) => {
    navigator.clipboard.writeText(code);
    setCopyStatus((prev) => ({ ...prev, [quizId]: true }));
    setTimeout(() => {
      setCopyStatus((prev) => {
        const upd = { ...prev };
        delete upd[quizId];
        return upd;
      });
    }, 5000);
  };

  const listToShow = tab === "active" ? activeQs : inactiveQs;

  return (
    <div className="quiz-dashboard">
      <h2>Saved Quizzes</h2>
      {notification && (
        <div className="notification-container show">
          <div className="notification">{notification}</div>
        </div>
      )}

      <div className="tabs">
        <button
          className={tab === "active" ? "tab active" : "tab"}
          onClick={() => setTab("active")}
        >
          Active Quizzes
        </button>
        <button
          className={tab === "inactive" ? "tab active" : "tab"}
          onClick={() => setTab("inactive")}
        >
          Inactive Quizzes
        </button>
      </div>

      {listToShow.length === 0 ? (
        <p className="no-quizzes">
          No {tab === "active" ? "active" : "inactive"} quizzes.
        </p>
      ) : (
        <div className="quiz-grid">
          {listToShow.map((quiz) => (
            <div key={quiz.id} className="quiz-card">
              <div className="quiz-details">
                <strong>{quiz.title}</strong> <span>({quiz.topic})</span> —{" "}
                {formatDate(quiz.created_at)}
              </div>
              <div className="quiz-actions-group">
                {tab === "active" && (
                  <>
                    <div className="quiz-actions-row quiz-actions-row-main">
                      <button
                        className="quiz-btn primary-action"
                        onClick={() => openStudentModal(quiz.id)}
                      >
                        Assign to Student
                      </button>
                      <button
                        className="quiz-btn primary-action"
                        onClick={() => openClassModal(quiz)}
                      >
                        Assign to Class
                      </button>
                      <button
                        className="quiz-btn primary-action"
                        onClick={() => handleCopyCode(quiz.code, quiz.id)}
                        disabled={!!copyStatus[quiz.id]}
                      >
                        {copyStatus[quiz.id] ? "Copied" : "Copy Code"}
                      </button>
                    </div>
                    <div className="divider-bar" />
                  </>
                )}
                <div className="quiz-actions-row quiz-actions-row-secondary">
                  {onEdit && (
                    <button
                      className="edit-btn"
                      onClick={() => {
                        onEdit(quiz.id);
                        navigate("/dashboard");
                      }}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    className="quiz-btn secondary-action"
                    onClick={() => handleExport(quiz.id, "pdf")}
                  >
                    Export PDF
                  </button>
                  <button
                    className="quiz-btn secondary-action"
                    onClick={() => handleExport(quiz.id, "json")}
                  >
                    Export JSON
                  </button>
                </div>
                <div className="quiz-actions-row quiz-actions-row-last">
                  {tab === "active" ? (
                    <button
                      className="quiz-btn deactivate-action"
                      onClick={() => toggleActive(quiz.id, false)}
                      style={{ marginLeft: "auto" }}
                    >
                      Deactivate Quiz
                    </button>
                  ) : (
                    <button
                      className="quiz-btn activate-action"
                      onClick={() => toggleActive(quiz.id, true)}
                      style={{ marginLeft: "auto" }}
                    >
                      Activate Quiz
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showStudentModal && (
        <div className="modal-overlay">
          <div className="modal card">
            <h3>Assign to Student</h3>
            {loadingStudents ? (
              <p>Loading students…</p>
            ) : (
              <select
                value={modalStudentId}
                onChange={(e) => {
                  setModalStudentId(e.target.value);
                  setModalStudentError("");
                }}
                className={modalStudentError ? "input-error" : ""}
              >
                <option value="">Select Student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} (#{student.id})
                  </option>
                ))}
              </select>
            )}
            <label>Due date &amp; time</label>
            <input
              type="datetime-local"
              value={modalDueAt}
              onChange={(e) => setModalDueAt(e.target.value)}
              className="due-input"
            />
            <label>Time limit (minutes)</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 30"
              value={modalTimeLimit}
              onChange={(e) => setModalTimeLimit(e.target.value)}
            />
            {modalStudentError && (
              <p className="error-text">{modalStudentError}</p>
            )}
            <div className="modal-actions">
              <button className="btn primary" onClick={confirmAssignStudent}>
                Confirm
              </button>
              <button className="btn secondary" onClick={closeStudentModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showClassModal && (
        <div className="modal-overlay">
          <div className="modal card">
            <h3>Assign to Class</h3>
            <select
              value={modalClassId}
              onChange={(e) => setModalClassId(e.target.value)}
            >
              <option value="">Select Class</option>
              {CLASS_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label>Due date &amp; time</label>
            <input
              type="datetime-local"
              value={modalDueAt}
              onChange={(e) => setModalDueAt(e.target.value)}
              className="due-input"
            />
            <label>Time limit (minutes)</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 30"
              value={modalTimeLimit}
              onChange={(e) => setModalTimeLimit(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn primary" onClick={confirmAssignClass}>
                Confirm
              </button>
              <button className="btn secondary" onClick={closeClassModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
