import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";
import {
  FaUser,
  FaEnvelope,
  FaUserGraduate,
  FaChalkboardTeacher,
} from "react-icons/fa";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("teacher");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [classId, setClassId] = useState("A");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username.trim()) return setError("Username is required");
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/auth/login", { username, role });
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

  // const handleRegister = async () => {
  //   if (!username.trim() || !name.trim() || !surname.trim() || !email.trim()) {
  //     setError("All fields are required");
  //     return;
  //   }
  //   setLoading(true);
  //   setError("");
  //   try {
  //     let res;
  //     if (role === "student") {
  //       res = await axios.post("/api/student/register", {
  //         username,
  //         name,
  //         surname,
  //         email,
  //         class_id: classId,
  //       });
  //     } else {
  //       res = await axios.post("/api/teacher/register", {
  //         username,
  //         name,
  //         surname,
  //         email,
  //       });
  //     }
  //     onLogin(res.data);
  //     // navigate after registration
  //     if (role === "teacher") navigate("/dashboard", { replace: true });
  //     else navigate("/quiz", { replace: true });
  //   } catch (err) {
  //     setError(err.response?.data?.error || "Registration failed.");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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

  //   return (
  //     <div className="login-container">
  //       <h2>
  //         {mode === "login"
  //           ? role === "teacher"
  //             ? "Teacher Login"
  //             : "Student Login"
  //           : role === "teacher"
  //           ? "Teacher Sign Up"
  //           : "Student Sign Up"}{" "}
  //       </h2>

  //       {error && <p className="login-error">{error}</p>}

  //       {mode === "login" ? (
  //         <>
  //           <input
  //             type="text"
  //             placeholder="Username"
  //             value={username}
  //             onChange={(e) => setUsername(e.target.value)}
  //             disabled={loading}
  //           />
  //           <select
  //             value={role}
  //             onChange={(e) => setRole(e.target.value)}
  //             disabled={loading}
  //           >
  //             <option value="teacher">Teacher</option>
  //             <option value="student">Student</option>
  //           </select>
  //           <button
  //             className="login-button"
  //             onClick={handleLogin}
  //             disabled={loading}
  //           >
  //             {loading ? "Logging in…" : "Login"}
  //           </button>

  //           {role === "student" && (
  //             <p>
  //               New here?{" "}
  //               <button
  //                 className="link-button"
  //                 onClick={() => setMode("register")}
  //                 disabled={loading}
  //               >
  //                 Sign up
  //               </button>
  //             </p>
  //           )}
  //         </>
  //       ) : (
  //         <>
  //           <input
  //             type="text"
  //             placeholder="Username"
  //             value={username}
  //             onChange={(e) => setUsername(e.target.value)}
  //             disabled={loading}
  //           />
  //           <input
  //             type="text"
  //             placeholder="First Name"
  //             value={name}
  //             onChange={(e) => setName(e.target.value)}
  //             disabled={loading}
  //           />
  //           <input
  //             type="text"
  //             placeholder="Last Name"
  //             value={surname}
  //             onChange={(e) => setSurname(e.target.value)}
  //             disabled={loading}
  //           />
  //           <input
  //             type="email"
  //             placeholder="Email"
  //             value={email}
  //             onChange={(e) => setEmail(e.target.value)}
  //             disabled={loading}
  //           />
  //           {role === "student" && (
  //             <select
  //               value={classId}
  //               onChange={(e) => setClassId(e.target.value)}
  //               disabled={loading}
  //             >
  //               <option value="A">Class A</option>
  //               <option value="B">Class B</option>
  //               <option value="C">Class C</option>
  //               <option value="D">Class D</option>
  //             </select>
  //           )}
  //           <button
  //             className="login-button"
  //             onClick={handleRegister}
  //             disabled={loading}
  //           >
  //             {loading ? "Registering…" : "Register"}
  //           </button>
  //           <p>
  //             Already have an account?{" "}
  //             <button
  //               className="link-button"
  //               onClick={() => {
  //                 setMode("login");
  //                 setError("");
  //               }}
  //               disabled={loading}
  //             >
  //               Login
  //             </button>
  //           </p>
  //         </>
  //       )}
  //     </div>
  //   );
  // }
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

          {mode === "register" && (
            <>
              <div className="input-icon">
                <FaUser />
                <input
                  type="text"
                  placeholder="First Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="input-icon">
                <FaUser />
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
              {role === "student" && (
                <select
                  className="login-select"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  disabled={loading}
                >
                  <option value="A">Class A</option>
                  <option value="B">Class B</option>
                  <option value="C">Class C</option>
                  <option value="D">Class D</option>
                </select>
              )}
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
