// ClassView.jsx
import React, { useState, useEffect } from "react";
import ClassStudentList from "./ClassStudentList";
import StudentDetail from "./StudentDetail";
import "../styles/ClassManagement.css";
import ConfirmModal from "../components/ConfirmModal"; // import the same modal
import { showToast } from "../components/toast"; // if you have a toaster

export default function ClassesView({ teacherId }) {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [newClassName, setNewClassName] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteClassId, setPendingDeleteClassId] = useState(null);

  useEffect(() => {
    fetch(`/api/teacher/${teacherId}/classes`)
      .then((res) => res.json())
      .then(setClasses);
  }, [teacherId]);

  const handleAddClass = async () => {
    if (!newClassName.trim()) return;
    try {
      const res = await fetch(`/api/teacher/${teacherId}/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClassName }),
      });
      if (!res.ok) throw new Error("Network error");
      showToast(`Class ${newClassName} created`, "success"); // success toast
      setNewClassName("");
      const updated = await fetch(`/api/teacher/${teacherId}/classes`);
      setClasses(await updated.json());
    } catch (err) {
      console.error(err);
      showToast("Failed to create class", "error"); // error toast
    }
  };

  const promptDeleteClass = (clsId) => {
    setPendingDeleteClassId(clsId);
    setShowDeleteModal(true);
  };

  const confirmDeleteClass = async () => {
    const clsId = pendingDeleteClassId;
    setShowDeleteModal(false);
    setPendingDeleteClassId(null);

    try {
      const res = await fetch(`/api/classes/${clsId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Network error");
      showToast(`Class ${clsId} deleted`, "success"); // success toast
      setClasses(classes.filter((cls) => cls.id !== clsId));
    } catch (err) {
      console.error(err);
      showToast("Failed to delete class", "error"); // error toast
    }
  };

  const cancelDeleteClass = () => {
    setShowDeleteModal(false);
    setPendingDeleteClassId(null);
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
              onClick={() => promptDeleteClass(cls.id)}
              className="delete-class-btn"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        message="Delete this class? All students will be unassigned."
        onCancel={cancelDeleteClass}
        onConfirm={confirmDeleteClass}
      />
    </div>
  );
}
