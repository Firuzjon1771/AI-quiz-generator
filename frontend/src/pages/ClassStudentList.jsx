import React, { useState, useEffect } from "react";
import "../styles/ClassManagement.css";
import StudentPerformanceChart from "../components/StudentPerformanceChart";

export default function ClassStudentList({ classId, onSelectStudent, onBack }) {
  const [students, setStudents] = useState([]);
  const [noClassStudents, setNoClassStudents] = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState("");
  const [performance, setPerformance] = useState([]);

  const fetchData = () => {
    fetch(`/api/classes/${classId}/students`)
      .then((res) => res.json())
      .then(setStudents);
    fetch(`/api/students/no_class`)
      .then((res) => res.json())
      .then(setNoClassStudents);
    fetch(`/api/classes/${classId}/performance`)
      .then((res) => res.json())
      .then(setPerformance);
  };

  useEffect(() => {
    fetchData();
  }, [classId]);
  const handleAddStudent = async () => {
    if (!selectedToAdd) return;
    await fetch(`/api/classes/${classId}/add_student`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: selectedToAdd }),
    });
    setSelectedToAdd("");
    fetchData();
  };

  const handleRemoveStudent = async (student_id) => {
    if (!window.confirm("Remove this student from class?")) return;
    await fetch(`/api/classes/${classId}/remove_student`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id }),
    });
    fetchData();
  };
  return (
    <div>
      <button onClick={onBack} className="back-button">
        ◀ Back to Classes
      </button>
      <div className="student-list">
        <h2>Students in Class</h2>
        {students.map((stu) => (
          <div className="student-card" key={stu.student_id}>
            <div className="student-info">
              {stu.name} ({stu.email})
            </div>
            <div className="student-actions">
              <button
                className="details-btn"
                onClick={() => onSelectStudent(stu.student_id)}
              >
                Details
              </button>
              <button
                className="remove-btn"
                onClick={() => handleRemoveStudent(stu.student_id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="add-student-section">
        <h3>Add Student to Class</h3>
        <select
          value={selectedToAdd}
          onChange={(e) => setSelectedToAdd(e.target.value)}
        >
          <option value="">Select student…</option>
          {noClassStudents.map((s) => (
            <option key={s.student_id} value={s.student_id}>
              {s.name} {s.surname} ({s.email})
            </option>
          ))}
        </select>
        <button onClick={handleAddStudent} disabled={!selectedToAdd}>
          Add Student
        </button>
      </div>
      <StudentPerformanceChart quizzes={performance} />
    </div>
  );
}
