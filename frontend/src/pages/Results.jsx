import React, { useState } from "react";
import ClassesView from "./ClassView";
import StudentsView from "./StudentsView";
import "../styles/Results.css";
export default function Results() {
  const [view, setView] = useState("classes");

  return (
    <div className="results-page">
      <h2>Results</h2>
      <div className="tab-buttons">
        <button
          onClick={() => setView("classes")}
          className={view === "classes" ? "active" : ""}
        >
          Classes
        </button>
        <button
          onClick={() => setView("students")}
          className={view === "students" ? "active" : ""}
        >
          Students
        </button>
      </div>
      <div className="results-view">
        {view === "classes" ? <ClassesView /> : <StudentsView />}
      </div>
    </div>
  );
}
