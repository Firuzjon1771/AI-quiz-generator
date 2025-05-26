// src/components/Spinner.jsx
import React from "react";
import "../styles/Spinner.css";

const Spinner = () => (
  <div className="spinner-container">
    <div className="spinner" />
    <p>Generating questions… please wait</p>
  </div>
);

export default Spinner;
