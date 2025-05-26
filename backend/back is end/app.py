import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS

def migrate_teachers_table(db_path="quizzes.db"):
    """
    Creates a `teachers` table and moves any role='teacher' rows
    out of `students` into `teachers`.
    """
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS teachers (
            teacher_id TEXT PRIMARY KEY,
            name       TEXT,
            surname    TEXT,
            email      TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    c.execute("""
        INSERT OR IGNORE INTO teachers(teacher_id,name,surname,email)
          SELECT student_id, name, surname, email
          FROM students
          WHERE role = 'teacher'
    """)

    c.execute("DELETE FROM students WHERE role = 'teacher'")

    conn.commit()
    conn.close()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})
 
from topic_detection import TopicDetector
from question_generation import QuestionGenerator
from summarizer import summarize_text
from upload_handler import handle_file_upload
from quiz_routes import register_quiz_routes
from student_routes import register_student_routes
from util_routes import register_util_routes

from classes import classes_bp
from class_students import class_students_bp
from students import students_bp
from student_detail import student_detail_bp

detector  = TopicDetector("topic_keywords_100plus_expanded.json")
generator = QuestionGenerator("question_templates_expanded.json")

register_quiz_routes(app)
register_util_routes(app)
register_student_routes(app)
handle_file_upload(app)




@app.route("/api/generate", methods=["POST"])
def generate_from_text():
    data      = request.json or {}
    text      = data.get("text", "")
    open_n    = int(data.get("openCount", 5))  
    mc_n      = int(data.get("mcCount",   5))
    questions = qg.generate_questions(
        source_text=text,
        num_open=open_n,
        num_mc=mc_n
    )
    return jsonify({ "questions": questions })



@app.route("/api/detect", methods=["POST"])
def detect():
    data = request.json or {}
    return jsonify(detector.detect_topics(data.get("text", "")))


@app.route("/api/summarize", methods=["POST"])
def summarize():
    data = request.json or {}
    return jsonify({"summary": summarize_text(data.get("text", ""))})


if __name__ == "__main__":
    app.run(debug=True)
