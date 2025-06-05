import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";
import {
  FaUser,
  FaEnvelope,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaIdBadge,
  FaSignature,
  FaUserTag,
  FaLock,
} from "react-icons/fa";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("teacher");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [classId, setClassId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!username.trim()) return setError("Username is required");
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/auth/login", {
        username,
        role,
        password,
      });
      onLogin(res.data);
      navigate(role === "teacher" ? "/dashboard" : "/quiz", { replace: true });
    } catch (err) {
      if (err.response?.status === 404) {
        setError("User not found. Please register first.");
        setMode("register");
      } else {
        setError("Login failed. Try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !name || !surname || !email) {
      return setError("All fields are required.");
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        username,
        name,
        surname,
        email,
        password,
        ...(role === "student" && { class_id: classId }),
      };
      const res = await axios.post(`/api/${role}/register`, payload);
      onLogin(res.data);
      navigate(role === "teacher" ? "/dashboard" : "/quiz", { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {" "}
        <div className="tabs">
          <button
            className={role === "teacher" ? "active" : ""}
            onClick={() => setRole("teacher")}
          >
            <FaChalkboardTeacher /> Teacher
          </button>
          <button
            className={role === "student" ? "active" : ""}
            onClick={() => setRole("student")}
          >
            <FaUserGraduate /> Student
          </button>
        </div>
        <h2 className="login-title">
          {mode === "login"
            ? `${role === "teacher" ? "Teacher" : "Student"} Login`
            : `${role === "teacher" ? "Teacher" : "Student"} Sign Up`}
        </h2>
        {error && <p className="login-error">{error}</p>}
        <div className={`form-transition ${mode}`}>
          <div className="input-icon">
            <FaUser />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="input-icon">
            <FaLock />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          {mode === "register" && (
            <>
              <div className="input-icon">
                <FaIdBadge />

                <input
                  type="text"
                  placeholder="First Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="input-icon">
                <FaUserTag />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="input-icon">
                <FaEnvelope />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </>
          )}

          <button
            className="login-button"
            onClick={mode === "login" ? handleLogin : handleRegister}
            disabled={loading}
          >
            {loading
              ? mode === "login"
                ? "Logging in..."
                : "Registering..."
              : mode === "login"
              ? "Login"
              : "Register"}
          </button>

          <p className="toggle-text">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button
              className="link-button"
              onClick={() => {
                setMode((m) => (m === "login" ? "register" : "login"));
                setError("");
              }}
            >
              {mode === "login" ? "Sign up" : "Login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
