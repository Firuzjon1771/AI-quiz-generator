import sqlite3
import json
import os
from fpdf import FPDF

DB_PATH = "quizzes.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # quizzes table
    c.execute("""
        CREATE TABLE IF NOT EXISTS quizzes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            topic TEXT NOT NULL,
            data TEXT NOT NULL,
            created_by TEXT DEFAULT 'admin',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            code TEXT,
            active INTEGER NOT NULL DEFAULT 1
        )
    """)
    # assignments table: now with due_at and time_limit
    c.execute("""
        CREATE TABLE IF NOT EXISTS assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            quiz_id INTEGER,
            student_id TEXT,
            status TEXT DEFAULT 'assigned',
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            due_at TEXT,
            score INTEGER DEFAULT 0,
            submitted_at TIMESTAMP,
            time_limit INTEGER
        )
    """)
    # migrate older DBs
    cols = [row[1] for row in c.execute("PRAGMA table_info(assignments)")]
    if "due_at" not in cols:
        c.execute("ALTER TABLE assignments ADD COLUMN due_at TEXT")
    if "time_limit" not in cols:
        c.execute("ALTER TABLE assignments ADD COLUMN time_limit INTEGER")
    # students table
    c.execute("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT UNIQUE NOT NULL,
            class_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_quiz(title, topic, qa_pairs, code, created_by="admin"):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "INSERT INTO quizzes (title, topic, data, code, created_by) VALUES (?, ?, ?, ?, ?)",
        (title, topic, json.dumps(qa_pairs), code, created_by)
    )
    conn.commit()
    quiz_id = c.lastrowid
    conn.close()
    return quiz_id

def get_quiz(quiz_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT title, topic, data FROM quizzes WHERE id = ?", (quiz_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return {
            "title": row[0],
            "topic": row[1],
            "questions": json.loads(row[2])
        }
    return None

def update_quiz(quiz_id, title, topic, qa_pairs):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "UPDATE quizzes SET title = ?, topic = ?, data = ? WHERE id = ?",
        (title, topic, json.dumps(qa_pairs), quiz_id)
    )
    conn.commit()
    updated = c.rowcount
    conn.close()
    return bool(updated)

def export_quiz_json(quiz_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT title, topic, data FROM quizzes WHERE id = ?", (quiz_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return {}
    return {
        "title": row[0],
        "topic": row[1],
        "questions": json.loads(row[2])
    }

def export_quiz_pdf(quiz_id, filename=None):
    quiz = get_quiz(quiz_id)
    if not quiz:
        return None
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.cell(200, 10, txt=quiz["title"], ln=True, align="C")
    pdf.ln(10)
    for i, qa in enumerate(quiz["questions"], start=1):
        if isinstance(qa, dict):
            question = qa.get("question", "")
            answer = qa.get("answer", "")
        elif isinstance(qa, (list, tuple)) and len(qa) == 2:
            question, answer = qa
        else:
            question, answer = "", ""
        pdf.multi_cell(0, 10, f"{i}. Q: {question}")
        pdf.multi_cell(0, 10, f"   A: {answer}")
        pdf.ln(2)
    os.makedirs("exports", exist_ok=True)
    safe_title = quiz["title"].replace(" ", "_")
    filename = filename or f"{safe_title}_{quiz_id}.pdf"
    path = os.path.join("exports", filename)
    pdf.output(path)
    return path

def assign_quiz_to_student(quiz_id, student_id, due_at=None, time_limit=None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "INSERT INTO assignments (quiz_id, student_id, due_at, time_limit) VALUES (?, ?, ?, ?)",
        (quiz_id, student_id, due_at, time_limit)
    )
    conn.commit()
    conn.close()
    return True

def set_quiz_active(quiz_id, active: bool):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE quizzes SET active = ? WHERE id = ?", (1 if active else 0, quiz_id))
    conn.commit()
    changed = c.rowcount
    conn.close()
    return bool(changed)

def list_quizzes(active: bool = True):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute(
        "SELECT id, title, topic, data, code, created_at, active FROM quizzes WHERE active = ? ORDER BY created_at DESC",
        (1 if active else 0,)
    )
    rows = c.fetchall()
    conn.close()
    return [dict(r) for r in rows]
