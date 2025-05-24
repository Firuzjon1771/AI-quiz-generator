import React, { useState, useEffect } from "react";
import ClassStudentList from "./ClassStudentList";
import StudentDetail from "./StudentDetail";
import "../styles/ClassManagement.css";

export default function ClassesView({ teacherId }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [newClassName, setNewClassName] = useState("");
  useEffect(() => {
    fetch(`/api/teacher/${teacherId}/classes`)
      .then((res) => res.json())
      .then(setClasses);
  }, [teacherId]);
  const handleAddClass = async () => {
    if (!newClassName.trim()) return;
    await fetch(`/api/teacher/${teacherId}/classes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newClassName }),
    });
    setNewClassName("");
    fetch(`/api/teacher/${teacherId}/classes`)
      .then((res) => res.json())
      .then(setClasses);
  };
  const handleDeleteClass = async (classId) => {
    if (!window.confirm("Delete this class? All students will be unassigned."))
      return;
    await fetch(`/api/classes/${classId}`, { method: "DELETE" });
    setClasses(classes.filter((cls) => cls.id !== classId));
  };
  if (selectedStudent) {
    return (
      <StudentDetail
        studentId={selectedStudent}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }
  if (selectedClass) {
    return (
      <ClassStudentList
        classId={selectedClass}
        onSelectStudent={setSelectedStudent}
        onBack={() => setSelectedClass(null)}
      />
    );
  }
  return (
    <div className="class-list">
      <h2>Your Classes</h2>
      <input
        placeholder="New class name"
        value={newClassName}
        onChange={(e) => setNewClassName(e.target.value)}
      />
      <button className="class-list-button" onClick={handleAddClass}>
        Add Class
      </button>
      <div>
        {classes.map((cls) => (
          <div key={cls.id} className="class-card">
            <button onClick={() => setSelectedClass(cls.id)}>{cls.name}</button>
            <button
              onClick={() => handleDeleteClass(cls.id)}
              className="delete-class-btn"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
