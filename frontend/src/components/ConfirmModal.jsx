import React from "react";
import "../styles/ConfirmModal.css";

export default function ConfirmModal({ isOpen, message, onCancel, onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="confirm-overlay">
      <div className="confirm-container">
        <p className="confirm-message">{message}</p>
        <div className="confirm-buttons">
          <button className="confirm-btn cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-btn confirm" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
