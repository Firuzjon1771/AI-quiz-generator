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

students_bp = Blueprint('students', __name__)

@students_bp.route('/api/students', methods=['GET'])
def get_all_students():
    """
    Returns all users marked role='student'.
    """
    db = get_db()
    rows = db.execute(
        """
        SELECT student_id, name, surname, email, class_id
        FROM students
        WHERE role = 'student'
        """
    ).fetchall()

    students = []
    for row in rows:
        first = row['name'] if row['name'] else row['student_id']
        last  = row['surname'] or ''
        email = row['email'] or ''
        students.append({
            "id":    row['student_id'],
            "name":  f"{first} {last}".strip(),
            "email": email,
            "class": row['class_id']
        })

    return jsonify(students)
