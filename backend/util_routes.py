from flask import request, jsonify, send_file
import sqlite3, json
from fpdf import FPDF

def register_util_routes(app):
    @app.route("/api/quiz/<int:quiz_id>/report", methods=["GET"])
    def download_report(quiz_id):
        conn = sqlite3.connect("quizzes.db")
        c = conn.cursor()
        c.execute("SELECT title, topic, data FROM quizzes WHERE id=?", (quiz_id,))
        quiz = c.fetchone()
        c.execute("SELECT student_id FROM assignments WHERE quiz_id=?", (quiz_id,))
        students = [r[0] for r in c.fetchall()]
        conn.close()

        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Arial", size=12)
        pdf.cell(200, 10, txt=f"Quiz Report - {quiz[0]}", ln=True, align="C")
        pdf.ln(5)
        pdf.multi_cell(0, 10, f"Topic: {quiz[1]}\n\nStudents Assigned: {', '.join(students)}")
        path = f"quiz_{quiz_id}_report.pdf"
        pdf.output(path)
        return send_file(path, as_attachment=True)

    @app.route("/api/quiz/assign", methods=["POST"])
    def assign_quiz_with_due():
        data       = request.json
        quiz_id    = data.get("quiz_id")
        student_id = data.get("student_id")
        due_at     = data.get("due_at")
        time_limit = data.get("time_limit")
        conn = sqlite3.connect("quizzes.db")
        c = conn.cursor()
        c.execute(
            "INSERT INTO assignments (quiz_id, student_id, due_at, time_limit) VALUES (?, ?, ?, ?)",
            (quiz_id, student_id, due_at, time_limit)
        )
        conn.commit()
        conn.close()
        return jsonify({"status":"assigned"}), 201

    @app.route("/api/student/<student_id>/quizzes", methods=["GET"])
    def student_quizzes_with_due(student_id):
        conn = sqlite3.connect("quizzes.db")
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute("""
          SELECT
            q.id           AS quiz_id,
            q.title        AS title,
            q.topic        AS topic,
            a.assigned_at  AS assigned_at,
            a.due_at       AS due_at,
            a.status       AS status,
            a.score        AS score,
            a.submitted_at AS submitted_at,
            a.time_limit   AS time_limit,
            a.id           AS assignment_id
          FROM quizzes q
          JOIN assignments a ON a.quiz_id = q.id
          WHERE a.student_id = ?
          ORDER BY a.assigned_at DESC
        """, (student_id,))
        rows = c.fetchall()
        conn.close()

        out = []
        for r in rows:
            out.append({
                "quiz_id":       r["quiz_id"],
                "title":         r["title"],
                "topic":         r["topic"],
                "assigned_at":   r["assigned_at"],
                "due_at":        r["due_at"],
                "status":        r["status"],
                "score":         r["score"],
                "submitted_at":  r["submitted_at"],
                "time_limit":    r["time_limit"],
                "assignment_id": r["assignment_id"],
            })
        return jsonify(out), 200
