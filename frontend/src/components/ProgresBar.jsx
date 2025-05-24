import React from "react";
import "../styles/ProgressBar.css";
export default function ProgressBar({ loading }) {
  return loading ? (
    <div className="progress-bar-container">
      <div className="progress-bar-anim" />
      <span className="progress-bar-label">
        Generating questions... please wait
      </span>
    </div>
  ) : null;
}
