import sqlite3
from flask import Blueprint, jsonify, current_app, g

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config.get('DATABASE', 'quizzes.db'),
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
    return g.db

class_students_bp = Blueprint('class_students', __name__)

@class_students_bp.route('/api/classes/<class_id>/students', methods=['GET'])
def get_students_by_class(class_id):
    """
    Returns only those rows in `students` where role='student' AND class_id matches.
    """
    db = get_db()
    rows = db.execute(
        """
        SELECT student_id, name, surname, email
        FROM students
        WHERE class_id = ?
          AND role = 'student'
        """,
        (class_id,)
    ).fetchall()

    students = []
    for row in rows:
        first = row['name'] if row['name'] else row['student_id']
        last  = row['surname'] or ''
        email = row['email'] or ''
        full_name = f"{first} {last}".strip()
        students.append({
            "id":    row['student_id'],
            "name":  full_name,
            "email": email
        })

    return jsonify(students)
