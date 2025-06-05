// Navbar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import "../styles/Navbar.css";

export default function Navbar({ onLogout, user, onDashboardClick }) {
  const { pathname } = useLocation();

  return (
    <header className="navbar">
      <div className="navbar-container">
        <h1 className="navbar-title">AI Quiz Generator</h1>
        <nav className="navbar-nav">
          {user.role === "teacher" && (
            <>
              <Link
                to="/dashboard"
                onClick={() => onDashboardClick?.()}
                className={
                  "nav-item " + (pathname === "/dashboard" ? "active" : "")
                }
              >
                Dashboard
              </Link>
              <Link
                to="/quizzes"
                className={
                  "nav-item " + (pathname === "/quizzes" ? "active" : "")
                }
              >
                Quizzes
              </Link>
              <Link
                to="/results"
                className={
                  "nav-item " + (pathname === "/results" ? "active" : "")
                }
              >
                Results
              </Link>
            </>
          )}
        </nav>
        <button onClick={onLogout} className="logout-button">
          Logout
        </button>
      </div>
    </header>
  );
}
