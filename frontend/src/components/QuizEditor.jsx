import React, { useEffect, useState } from "react";
import axios from "axios";
import Spinner from "./Spinner";
import "../styles/QuizEditor.css";
import { useNavigate } from "react-router-dom";

export default function QuizEditor({ quizId, onBack }) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [editedQuestions, setEditedQuestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [fullContent, setFullContent] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!quizId) return;
    axios.get(`/api/quiz/${quizId}/json`).then(({ data }) => {
      setTitle(data.title);
      setTopic(data.topic);
      setFullContent(data.source_text || "");

      const mapped = (data.questions || []).map((item) => {
        if (Array.isArray(item)) {
          return {
            type: "open",
            question: item[0],
            answer: item[1],
            options: [],
          };
        } else if (item.type === "mc") {
          return {
            type: "mc",
            question: item.question,
            answer: item.answer || "",
            options: Array.isArray(item.options)
              ? item.options.map((o) => (typeof o === "string" ? o : o.text))
              : [],
          };
        } else {
          return {
            type: "open",
            question: item.question,
            answer: item.answer,
            options: [],
          };
        }
      });
      setEditedQuestions(mapped);
    });
  }, [quizId]);

  const handleUpdate = (i, field, value) => {
    setEditedQuestions((prev) =>
      prev.map((q, idx) => (idx === i ? { ...q, [field]: value } : q))
    );
  };

  const toggleMakeMC = async (idx) => {
    const qa = editedQuestions[idx];
    setEditedQuestions((prev) =>
      prev.map((q, i) =>
        i === idx
          ? { ...q, type: q.type === "open" ? "mc" : "open", options: [] }
          : q
      )
    );

    if (qa.type === "open") {
      try {
        const res = await axios.post("/api/quiz/generate_mc", {
          question: qa.question,
          answer: qa.answer,
          num_choices: 4,
        });
        const opts = res.data.options || [];
        setEditedQuestions((prev) =>
          prev.map((q, i) =>
            i === idx ? { ...q, options: opts, type: "mc" } : q
          )
        );
      } catch (err) {
        console.error("MC generation failed:", err);
        alert("Failed to generate MC options");
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payloadQs = editedQuestions.map((q) =>
        q.type === "mc"
          ? {
              type: "mc",
              question: q.question,
              options: q.options,
              answer: q.answer,
            }
          : [q.question, q.answer]
      );
      await axios.put(`/api/quiz/${quizId}`, {
        title,
        topic,
        questions: payloadQs,
      });
      alert("Quiz saved!");
      onBack();
    } catch (err) {
      console.error("Save failed:", err);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="quiz-editor">
      <button onClick={() => navigate("/quizzes")} className="back-button">
        ← Back
      </button>

      <h2>{quizId ? "Edit Quiz" : "New Quiz"}</h2>

      <div className="section">
        <label>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="section">
        <label>Topic</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </div>

      <h3>Review &amp; Approve Questions</h3>
      <div className="review-questions">
        {editedQuestions.map((qa, i) => (
          <div key={i} className="question-card">
            <div className="question-header">
              <label>
                <input
                  type="checkbox"
                  checked={qa.type === "mc"}
                  onChange={() => toggleMakeMC(i)}
                />
                Make multiple-choice
              </label>
            </div>

            <div className="question-body">
              <textarea
                className="editor-textarea"
                rows={2}
                value={qa.question}
                onChange={(e) => handleUpdate(i, "question", e.target.value)}
              />
            </div>

            {qa.type === "mc" ? (
              <div className="choices">
                {qa.options.map((opt, j) => (
                  <div key={j} className="choice-row">
                    <label className="choice-label">
                      Option {String.fromCharCode(65 + j)}
                    </label>
                    <input
                      type="text"
                      className="editor-input"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...qa.options];
                        newOpts[j] = e.target.value;
                        handleUpdate(i, "options", newOpts);
                      }}
                    />
                  </div>
                ))}

                <div className="choice-row">
                  <label className="choice-label">Correct answer</label>
                  <input
                    type="text"
                    className="editor-input"
                    value={qa.answer}
                    onChange={(e) => handleUpdate(i, "answer", e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <textarea
                className="editor-textarea answer-area"
                rows={1}
                placeholder="Answer"
                value={qa.answer}
                onChange={(e) => handleUpdate(i, "answer", e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <button className="save-button" onClick={handleSave} disabled={saving}>
        {saving ? <Spinner /> : "Save Quiz"}
      </button>
    </div>
  );
}
