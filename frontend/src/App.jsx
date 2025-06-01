import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./components/Login";
import Navbar from "./components/Navbar";
import Layout from "./components/Layout";

import QuizDashboard from "./components/QuizDashboard";
import QuizEditor from "./components/QuizEditor";
import StudentQuiz from "./components/StudentQuiz";
import QuizTake from "./components/QuizTake";
import UploadForm from "./components/UploadForm";
import SaveQuiz from "./components/SaveQuiz";
import StudentsList from "./components/StudentsList";
import Results from "./pages/Results";
import QuizResult from "./components/QuizResult";

import { ToastWrapper, showToast } from "./components/toast";

import "./styles/App.css";

const App = () => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [editingQuizId, setEditingQuizId] = useState(null);
  const [topic, setTopic] = useState("");
  const [summary, setSummary] = useState("");
  const [questions, setQuestions] = useState([]);

  const [openCount, setOpenCount] = useState(5);
  const [mcCount, setMcCount] = useState(5);

  const handleLogin = (userObj) => {
    localStorage.setItem("user", JSON.stringify(userObj));
    setUser(userObj);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout>
      {{
        navbar: (
          <Navbar
            onLogout={handleLogout}
            user={user}
            onDashboardClick={() => setEditingQuizId(null)}
          />
        ),
        content: (
          <main className="app-container">
            <ToastWrapper />
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              <Route
                path="/dashboard"
                element={
                  user.role === "teacher" ? (
                    editingQuizId ? (
                      <QuizEditor
                        quizId={editingQuizId}
                        onBack={() => setEditingQuizId(null)}
                      />
                    ) : (
                      <>
                        <div className="dashboard-wrapper">
                          <h2 className="section-title">Ai quizz Generator</h2>
                          <UploadForm
                            setTopic={setTopic}
                            setSummary={setSummary}
                            setQuestions={setQuestions}
                            openCount={openCount}
                            setOpenCount={setOpenCount}
                            mcCount={mcCount}
                            setMcCount={setMcCount}
                          />
                          {topic && questions.length > 0 && (
                            <div className="detected-results">
                              <h4>Detected Topic: {topic}</h4>
                              <p>
                                <strong>Summary:</strong> {summary}
                              </p>
                              <SaveQuiz
                                approved={questions}
                                topic={topic}
                                onSave={() => {
                                  setTopic("");
                                  setSummary("");
                                  setQuestions([]);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )
                  ) : (
                    <StudentQuiz studentId={user.username} />
                  )
                }
              />

              <Route
                path="/quizzes"
                element={<QuizDashboard onEdit={setEditingQuizId} />}
              />
              <Route
                path="/quiz/take/:assignmentId"
                element={<QuizTake studentId={user.username} />}
              />

              <Route
                path="/results/*"
                element={
                  user.role === "teacher" ? (
                    <Results user={user} />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                }
              />
              <Route
                path="/quiz/result/:assignmentId"
                element={<QuizResult />}
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        ),
      }}
    </Layout>
  );
};

export default App;
