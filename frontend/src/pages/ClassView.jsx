import React, { useState, useEffect } from "react";
import ClassStudentList from "./ClassStudentList";
import StudentDetail from "./StudentDetail";

export default function ClassesView() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    fetch("/api/classes")
      .then((res) => res.json())
      .then(setClasses);
  }, []);

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
      <h2>Classes</h2>
      {classes.map((cls) => (
        <button key={cls.id} onClick={() => setSelectedClass(cls.id)}>
          {cls.name}
        </button>
      ))}
    </div>
  );
}
