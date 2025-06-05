import React, { useState } from "react";
import axios from "axios";
import "../styles/QuestionReview.css";
import { showToast } from "../components/toast";
const QuestionReview = ({ questions, topic, onSave }) => {
  const [title, setTitle] = useState("");

  // const [editedQuestions, setEditedQuestions] = useState(
  //   questions.map(([q, a]) => ({
  //     question: q,
  //     answer: a,
  //     approved: true,
  //     mcEnabled: false,
  //     options: [],
  //   }))
  // );
  const [editedQuestions, setEditedQuestions] = useState(
    questions.map(([q, a]) => ({
      question: q,
      answer: a,
      approved: true,
      mcEnabled: false,
      options: [],
    }))
  );
  const handleMCToggle = async (idx, checked) => {
    const list = [...editedQuestions];
    list[idx].mcEnabled = checked;

    if (checked) {
      try {
        const { data } = await axios.post(
          "http://localhost:5000/api/generate-mc",
          {
            question: list[idx].question,
            answer: list[idx].answer,
            num_choices: 4,
          }
        );
        list[idx].options = data.options;
      } catch (err) {
        console.error("MC generate error:", err);
        showToast("Failed to generate options", "error");
        list[idx].mcEnabled = false;
      }
    } else {
      list[idx].options = [];
    }

    setEditedQuestions(list);
  };
  const handleOptionChange = (qIdx, optIdx, txt) => {
    const list = [...editedQuestions];
    list[qIdx].options[optIdx].text = txt;
    setEditedQuestions(list);
  };
  const handleOptionSelect = (qIdx, optIdx) => {
    const list = [...editedQuestions];
    list[qIdx].options = list[qIdx].options.map((opt, i) => ({
      ...opt,
      correct: i === optIdx,
    }));
    setEditedQuestions(list);
  };
  const handleChange = (index, field, value) => {
    const updated = [...editedQuestions];
    updated[index][field] = value;
    setEditedQuestions(updated);
  };

  const handleSave = async () => {
    const filtered = editedQuestions.filter((q) => q.approved);

    const payloadQs = filtered.map((q) =>
      q.mcEnabled
        ? { type: "mc", question: q.question, options: q.options }
        : { type: "open", question: q.question, answer: q.answer }
    );

    const saveRes = await axios.post("http://localhost:5000/api/quiz/save", {
      title,
      topic,
      questions: payloadQs,
    });

    showToast(`Quiz saved with ID: ${saveRes.data.quiz_id}`, "success");
    onSave && onSave(saveRes.data.quiz_id);
  };

  return (
    <div className="question-review">
      <h3 className="qr-heading">Review & Edit Questions</h3>

      <input
        type="text"
        placeholder="Quiz title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="qr-input"
      />

      {editedQuestions.map((qa, idx) => (
        <div key={idx} className="qr-pair">
          <div className="qr-controls">
            {/* <label className="qr-checkbox">
              <input
                type="checkbox"
                checked={qa.approved}
                onChange={(e) =>
                  handleChange(idx, "approved", e.target.checked)
                }
              />{" "}
              Approve
            </label> */}
            <div className="qr-controls">
              <label className="qr-checkbox">
                <input
                  type="checkbox"
                  checked={qa.approved}
                  onChange={(e) =>
                    handleChange(idx, "approved", e.target.checked)
                  }
                />{" "}
                Approve
              </label>
              <label className="qr-checkbox">
                <input
                  type="checkbox"
                  checked={qa.mcEnabled}
                  onChange={(e) => handleMCToggle(idx, e.target.checked)}
                />{" "}
                Multi-choice
              </label>
            </div>
          </div>

          <textarea
            className="qr-textarea"
            rows={2}
            value={qa.question}
            onChange={(e) => handleChange(idx, "question", e.target.value)}
          />

          {qa.mcEnabled ? (
            <div className="qr-mc-options">
              {qa.options.map((opt, j) => (
                <div key={j} className="qr-mc-option">
                  <input
                    type="radio"
                    name={`correct-${idx}`}
                    checked={opt.correct}
                    onChange={() => handleOptionSelect(idx, j)}
                  />
                  <input
                    type="text"
                    value={opt.text}
                    onChange={(e) => handleOptionChange(idx, j, e.target.value)}
                    className="qr-text-input"
                  />
                </div>
              ))}
            </div>
          ) : (
            <textarea
              className="qr-textarea"
              rows={2}
              value={qa.answer}
              onChange={(e) => handleChange(idx, "answer", e.target.value)}
            />
          )}
        </div>
      ))}

      <button className="btn primary qr-save" onClick={handleSave}>
        💾 Save Quiz
      </button>
    </div>
  );
};

export default QuestionReview;
