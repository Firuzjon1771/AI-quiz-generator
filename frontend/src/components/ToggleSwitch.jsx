import React from "react";
import "../styles/UploadForm.css";

export function ToggleSwitch({ id, checked, onChange }) {
  return (
    <label className="toggle-switch" htmlFor={id}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="slider" />
    </label>
  );
}
