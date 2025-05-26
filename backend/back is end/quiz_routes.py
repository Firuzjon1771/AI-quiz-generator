# backend/quiz_routes.py
import os
import re
import sqlite3
import string
import random
import json
from flask import request, jsonify, send_file
from quiz_model import (
    init_db, save_quiz, get_quiz, update_quiz,
    export_quiz_json, export_quiz_pdf,
    assign_quiz_to_student, set_quiz_active,
    list_quizzes as model_list_quizzes,
)
from question_generation import QuestionGenerator

DATA_FILE = os.path.join(
    os.path.dirname(__file__),
    "topic_keywords_100plus_expanded.json"
)
def generate_quiz_code(length=10):
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))

def register_quiz_routes(app):
    # Initialize DB
    init_db()

    # ─── SAVE QUIZ ────────────────────────────────────────────────────────────
    @app.route("/api/quiz/save", methods=["POST"])
    def save_quiz_route():
        data = request.get_json(force=True)
        code = data.get("code") or generate_quiz_code()
        quiz_id = save_quiz(
            data["title"], data["topic"], data["questions"],
            code=code, created_by=data.get("created_by")
        )
        return jsonify({"quiz_id": quiz_id, "code": code}), 201

    # ─── GENERATE QUIZ (with optional per-JSON‐keywords branch) ───────────────
    @app.route("/api/quiz/generate", methods=["POST"])
    def generate_quiz():
        if request.is_json:
            data = request.get_json()
            text         = data.get("text","")
            topic        = data.get("topic","")
            total        = int(data.get("total_count",10))
            open_count   = int(data.get("open_count", total))
            mc_count     = int(data.get("mc_count",0))
            with_summary = bool(data.get("with_summary", False))

            # branch: teacher-supplied keywords
            if "keywords" in data:
                keywords = data["keywords"]
                found = [
                    kw for kw in keywords
                    if re.search(r"\b"+re.escape(kw)+r"\b", text, re.IGNORECASE)
                ]
                if len(found) < max(1, len(keywords)//3):
                    return (
                      jsonify({
                        "error":"Too few of your keywords appear in the text.",
                        "found_keywords": found
                      }),
                      400
                    )

                qg = QuestionGenerator()
                questions = []
                for kw in keywords:
                    qs = qg.generate_questions(
                      topic=f"{topic} – {kw}",
                      content=text,
                      num_questions=1,
                      open_count=1,
                      mc_count=0
                    )
                    questions.extend(qs)
                questions = questions[:total]

                payload = {"questions": questions}
                if with_summary:
                    payload["summary"] = qg.summarize(text)
                return jsonify(payload), 200

        # fallback
        data          = request.get_json(force=True) or {}
        text          = data.get("text","")
        topic         = data.get("topic","")
        total         = int(data.get("total_count",10))
        open_count    = int(data.get("open_count", total))
        mc_count      = int(data.get("mc_count",0))
        with_summary  = bool(data.get("with_summary", False))

        qg = QuestionGenerator()
        questions = qg.generate_questions(
          topic=topic,
          content=text,
          num_questions=total,
          open_count=open_count,
          mc_count=mc_count
        )

        payload = {"questions": questions}
        if with_summary:
            payload["summary"] = qg.summarize(text)
        return jsonify(payload), 200

    # ─── MULTIPLE‐CHOICE GENERATION ───────────────────────────────────────────
    @app.route("/api/quiz/generate_mc", methods=["POST"])
    def generate_multiple_choice():
        data     = request.get_json(force=True) or {}
        question = data.get("question","")
        answer   = data.get("answer","")
        num      = int(data.get("num_choices",4))
        opts     = QuestionGenerator().convert_to_multiple_choice(
                      question, answer, num
                   )
        return jsonify({"options": opts}), 200

    # ─── KEYWORD‐BASED QUIZ GENERATION ───────────────────────────────────────
    @app.route("/api/quiz/generate_by_keywords", methods=["POST"])
    def generate_by_keywords():
        data         = request.get_json(force=True) or {}
        text         = data.get("text", "")
        topic        = data.get("topic", "")
        total        = int(data.get("total_count", 10))
        keywords     = data.get("keywords", [])
        with_summary = bool(data.get("with_summary", False))

        if not keywords:
            return jsonify({"error": "No keywords provided"}), 400

        qg = QuestionGenerator()
        questions = []
        # call generate_per_keyword exactly
        for kw in keywords:
            qa = qg.generate_per_keyword(
                topic,       # positional 1st arg
                text,        # positional 2nd arg
                1,           # total_count=1
                [kw]         # keywords list
            )
            questions.extend(qa)
            if len(questions) >= total:
                break

        questions = questions[:total]
        payload = {"questions": questions}
        if with_summary:
            payload["summary"] = qg.summarize(text)
        return jsonify(payload), 200
    # ─── TOPIC MAP ENDPOINT ──────────────────────────────────────────────
    @app.route("/api/topics", methods=["GET"])
    def list_topics():
        with open(DATA_FILE, "r") as f:
            return jsonify(json.load(f)), 200

    @app.route("/api/topics/add", methods=["POST"])
    def add_topic():
        payload  = request.get_json(force=True) or {}
        topic    = payload.get("topic","").strip()
        keywords = payload.get("keywords")
        if not topic or not isinstance(keywords, list) or not keywords:
            return jsonify({
              "error":"Must provide topic (string) & keywords (non-empty list)"
            }), 400

        # load & update
        with open(DATA_FILE, "r+") as f:
            data = json.load(f)
            if topic in data:
                return jsonify({"status":"exists"}), 200
            data[topic] = keywords
            # overwrite + truncate
            f.seek(0)
            json.dump(data, f, indent=2, sort_keys=True)
            f.truncate()
        return jsonify({"status":"added"}), 201
    # ─── EXPORT, ASSIGN, LIST, ETC. (unchanged) ─────────────────────────────
    @app.route("/api/quiz/<int:quiz_id>/json", methods=["GET"])
    def export_json(quiz_id):
        return jsonify(export_quiz_json(quiz_id))

    @app.route("/api/quiz/<int:quiz_id>/pdf", methods=["GET"])
    def export_pdf(quiz_id):
        path = export_quiz_pdf(quiz_id, filename=f"quiz_{quiz_id}.pdf")
        if path:
            return send_file(path, as_attachment=True)
        return jsonify({"error": "Quiz not found"}), 404

    @app.route("/api/quiz/assign", methods=["POST"])
    def assign_quiz():
        data       = request.get_json(force=True)
        quiz_id    = data.get("quiz_id")
        student_id = data.get("student_id")
        due_at     = data.get("due_at")
        time_limit = data.get("time_limit")  # <-- ADD THIS
        if not quiz_id or not student_id:
            return jsonify({"error": "quiz_id and student_id required"}), 400
        assign_quiz_to_student(quiz_id, student_id, due_at, time_limit)  # <-- PASS IT IN
        return jsonify({"status":"success", "due_at": due_at}), 201


    @app.route("/api/quiz/assign/class", methods=["POST"])
    def assign_quiz_to_class():
        data     = request.get_json(force=True)
        quiz_id  = data.get("quiz_id")
        class_id = data.get("class_id")
        due_at   = data.get("due_at")
        if not quiz_id or not class_id:
            return jsonify({"error":"Missing quiz_id or class_id"}), 400
        conn = sqlite3.connect("quizzes.db")
        c    = conn.cursor()
        c.execute("SELECT student_id FROM students WHERE class_id = ?", (class_id,))
        student_ids = [r[0] for r in c.fetchall()]
        conn.close()
        for sid in student_ids:
            assign_quiz_to_student(quiz_id, sid, due_at)
        return jsonify({
            "status":      "success",
            "assigned_to": len(student_ids),
            "due_at":      due_at
        }), 200

    @app.route("/api/quiz/join", methods=["POST"])
    def join_quiz_by_code():
        data       = request.get_json(force=True)
        code       = data.get("code","").strip().upper()
        student_id = data.get("student_id")
        due_at     = data.get("due_at")
        if not code or not student_id:
            return jsonify({"error":"Missing quiz code or student_id"}), 400
        conn = sqlite3.connect("quizzes.db")
        c    = conn.cursor()
        c.execute("SELECT id FROM quizzes WHERE code = ?", (code,))
        row  = c.fetchone()
        conn.close()
        if not row:
            return jsonify({"error":"Invalid quiz code"}), 404
        assign_quiz_to_student(row[0], student_id, due_at)
        return jsonify({
            "status":     "success",
            "quiz_id":    row[0],
            "student_id": student_id,
            "due_at":     due_at
        }), 200

    @app.route("/api/quizzes/all", methods=["GET"])
    def list_all_quizzes():
        conn = sqlite3.connect("quizzes.db")
        c    = conn.cursor()
        c.execute(
          "SELECT id,title,topic,code,created_at FROM quizzes ORDER BY created_at DESC"
        )
        quizzes = [
          {"id":r[0],"title":r[1],"topic":r[2],"code":r[3],"created_at":r[4]}
          for r in c.fetchall()
        ]
        conn.close()
        return jsonify(quizzes)

    @app.route("/api/quizzes", methods=["GET"])
    def list_quizzes():
        active = request.args.get("active","1")=="1"
        return jsonify(model_list_quizzes(active=active)), 200

    @app.route("/api/quiz/<int:quiz_id>", methods=["PUT"])
    def update_quiz_route(quiz_id):
        data    = request.json or {}
        success = update_quiz(
            quiz_id,
            data.get("title",""),
            data.get("topic",""),
            data.get("questions",[])
        )
        if not success:
            return jsonify({"error":"Quiz not found"}), 404
        return jsonify({"quiz_id":quiz_id}), 200

    @app.route("/api/quiz/<int:quiz_id>/activate", methods=["POST"])
    def activate_quiz(quiz_id):
        if not set_quiz_active(quiz_id, True):
            return jsonify({"error":"Quiz not found"}), 404
        return jsonify({"status":"activated"}), 200

    @app.route("/api/quiz/<int:quiz_id>/deactivate", methods=["POST"])
    def deactivate_quiz(quiz_id):
        if not set_quiz_active(quiz_id, False):
            return jsonify({"error":"Quiz not found"}), 404
        return jsonify({"status":"deactivated"}), 200
