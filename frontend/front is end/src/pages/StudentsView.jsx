import React, { useState, useEffect } from "react";
import StudentDetail from "./StudentDetail";

export default function StudentsView() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    fetch("/api/students")
      .then((res) => res.json())
      .then(setStudents);
  }, []);

  if (selectedStudent) {
    return (
      <StudentDetail
        studentId={selectedStudent}
        onSelectStudent={setSelectedStudent}
        onBack={() => setSelectedStudent(null)}
      />
    );
  }

  return (
    <div className="student-list">
      {students.map((stu) => (
        <div
          key={stu.id}
          className="student-card"
          onClick={() => setSelectedStudent(stu.id)}
        >
          <h3>{stu.name}</h3>
          <div className="student-details">
            <p>
              <strong>Email:</strong> {stu.email}
            </p>
            <p>
              <strong>Class:</strong> {stu.class}
            </p>
            <p>
              <strong>Student ID:</strong> {stu.id}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
