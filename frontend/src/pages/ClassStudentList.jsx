import React, { useState, useEffect } from "react";

export default function ClassStudentList({ classId, onSelectStudent, onBack }) {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetch(`/api/classes/${classId}/students`)
      .then((res) => res.json())
      .then(setStudents);
  }, [classId]);

  return (
    <div>
      <button onClick={onBack} className="back-button">
        ◀ Back to Classes
      </button>
      <div className="student-list">
        <h2>Students in Class</h2>
        {students.map((stu) => (
          <div
            className="student-card"
            key={stu.student_id}
            onClick={() => onSelectStudent(stu.student_id)}
          >
            {stu.name} ({stu.email})
          </div>
        ))}
      </div>
    </div>
  );
}
