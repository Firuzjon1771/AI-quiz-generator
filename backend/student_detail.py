import sqlite3
import json
from flask import Blueprint, jsonify, current_app, g, abort

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(
            current_app.config.get('DATABASE', 'quizzes.db'),
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
    return g.db

student_detail_bp = Blueprint('student_detail', __name__)

@student_detail_bp.route('/api/students/<student_id>', methods=['GET'])
def get_student_detail(student_id):
    """
    Returns detailed info (basic info + quizzes) for a single student,
    reading from the real database.
    """
    db = get_db()

    stu = db.execute(
        """
        SELECT student_id, name, surname, email, class_id
        FROM students
        WHERE student_id = ?
        """,
        (student_id,)
    ).fetchone()
    if not stu:
        abort(404, description="Student not found")

    first = stu['name'] if stu['name'] else stu['student_id']
    last  = stu['surname'] or ''
    full_name = f"{first} {last}".strip()

    student_obj = {
        "id":    stu['student_id'],
        "name":  full_name,
        "email": stu['email'] or '',
        "class": stu['class_id']
    }

    rows = db.execute(
        """
        SELECT
          q.id            AS quiz_id,
          q.title         AS title,
          a.assigned_at   AS assigned,
          a.due_at        AS due_at,
          a.score         AS score,
          a.status        AS status,
          a.submitted_at        AS submitted_at
        FROM assignments a
        JOIN quizzes q ON a.quiz_id = q.id
        WHERE a.student_id = ?
        ORDER BY a.assigned_at DESC
        """,
        (student_id,)
    ).fetchall()

    quizzes = []
    for r in rows:
        submitted = None if r['status'] == 'assigned' else "" 
        quizzes.append({
            "quiz_id":  r['quiz_id'],
            "title":    r['title'],
            "assigned": r['assigned'],
            "due_at":   r['due_at'],
            "score":    r['score'],
            "submitted_at": r["submitted_at"],
        })

    student_obj["quizzes"] = quizzes

    return jsonify(student_obj)