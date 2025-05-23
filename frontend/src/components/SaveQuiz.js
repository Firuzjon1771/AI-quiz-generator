import React, { useState, useEffect } from "react";
import axios from "axios";

export default function SaveQuiz({ approved, topic, onSave }) {
  const [title, setTitle] = useState("");
  const [edited, setEdited] = useState([]);

  useEffect(() => {
    const cap = topic[0]?.toUpperCase() + topic.slice(1);
    setTitle(`${cap} Quiz`);
    setEdited(
      approved.map(([q, a]) => ({
        question: q,
        answer: a,
        approved: true,
        type: "open",
        options: [],
        correctIndex: 0,
        loadingMC: false,
      }))
    );
  }, [approved, topic]);

  const toggleType = async (idx) => {
    const item = edited[idx];
    const newType = item.type === "open" ? "mc" : "open";
    setEdited((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, type: newType, options: [] } : q))
    );

    if (item.type === "open") {
      try {
        const res = await axios.post("/api/quiz/generate_mc", {
          question: item.question,
          answer: item.answer,
          num_choices: 4,
        });
        const opts = Array.isArray(res.data.options) ? res.data.options : [];
        setEdited((prev) =>
          prev.map((q, i) => (i === idx ? { ...q, options: opts } : q))
        );
      } catch (err) {
        console.error("MC generation failed:", err);
        alert("Failed to generate MC options");
        setEdited((prev) =>
          prev.map((q, i) =>
            i === idx ? { ...q, type: "open", options: [] } : q
          )
        );
      }
    }
  };
  const handleChange = (idx, field, val) => {
    setEdited((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const handleOptionChange = (qIdx, optIdx, val) => {
    setEdited((prev) =>
      prev.map((item, i) =>
        i === qIdx
          ? {
              ...item,
              options: item.options.map((o, j) => (j === optIdx ? val : o)),
            }
          : item
      )
    );
  };

  const handleSave = async () => {
    const filtered = edited.filter((q) => q.approved);
    if (!filtered.length) return alert("No approved questions to save.");

    const qs = filtered.map((q) =>
      q.type === "open"
        ? [q.question, q.answer]
        : {
            type: "mc",
            question: q.question,
            options: q.options,
            answer: q.options[q.correctIndex] || "",
          }
    );

    try {
      const { data } = await axios.post("/api/quiz/save", {
        title,
        topic,
        questions: qs,
      });
      alert("Saved quiz id " + data.quiz_id);
      onSave?.(data.quiz_id);
    } catch (err) {
      console.error(err);
      alert("Save failed");
    }
  };

  return (
    <div style={{ marginTop: 30 }}>
      <h3>Review & Approve</h3>
      <input
        style={{ width: "60%", padding: 8, marginBottom: 12 }}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {edited.map((q, idx) => (
        <div
          key={idx}
          style={{
            padding: 10,
            marginBottom: 12,
            border: "1px solid #ddd",
            borderRadius: 4,
            background: "#f9f9f9",
          }}
        >
          <label>
            <input
              type="checkbox"
              checked={q.approved}
              onChange={(e) => handleChange(idx, "approved", e.target.checked)}
            />{" "}
            Approve
          </label>

          <label style={{ marginLeft: 12 }}>
            <input
              type="checkbox"
              checked={q.type === "mc"}
              disabled={q.loadingMC}
              onChange={() => toggleType(idx)}
            />{" "}
            Make multiple-choice
          </label>
          {q.loadingMC && <em style={{ marginLeft: 8 }}>Generating…</em>}

          <textarea
            rows={2}
            value={q.question}
            onChange={(e) => handleChange(idx, "question", e.target.value)}
            style={{ width: "100%", marginTop: 8 }}
          />

          {q.type === "open" ? (
            <textarea
              rows={2}
              value={q.answer}
              onChange={(e) => handleChange(idx, "answer", e.target.value)}
              style={{ width: "100%", marginTop: 8 }}
            />
          ) : (
            <div style={{ marginTop: 8 }}>
              {q.options.map((opt, i) => (
                <div key={i} style={{ marginBottom: 4 }}>
                  <input
                    type="radio"
                    name={`correct-${idx}`}
                    checked={q.correctIndex === i}
                    onChange={() => handleChange(idx, "correctIndex", i)}
                  />{" "}
                  <input
                    style={{ width: "85%" }}
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, i, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      <button onClick={handleSave} style={{ padding: "8px 16px" }}>
        Save Quiz
      </button>
    </div>
  );
}
