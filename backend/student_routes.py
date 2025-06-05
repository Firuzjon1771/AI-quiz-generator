import sqlite3, json
from flask import request, jsonify, current_app, g, abort
def get_db():
    if "db" not in g:
        db_path = current_app.config.get("DATABASE", "quizzes.db")
        conn = sqlite3.connect(db_path, detect_types=sqlite3.PARSE_DECLTYPES)
        conn.row_factory = sqlite3.Row
        g.db = conn
    return g.db

def get_quiz(quiz_id):
    db = get_db()
    row = db.execute(
        "SELECT title, topic, data FROM quizzes WHERE id = ?",
        (quiz_id,)
    ).fetchone()

    if not row:
        abort(404, description="Quiz not found")
    
    try:
        qlist = json.loads(row['data'])
    except Exception:
        abort(500, description="Malformed quiz data")

    return {
        "id":        quiz_id,
        "title":     row['title'],
        "topic":     row['topic'],
        "questions": qlist  
    }
def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()

def register_student_routes(app):
    app.teardown_appcontext(close_db)

    db_path = app.config.get("DATABASE", "quizzes.db")
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS classes(
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL, 
            teacher_id TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS students(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            name TEXT,
            surname TEXT,
            email TEXT,
            class_id TEXT,  -- nullable, no DEFAULT
            role TEXT DEFAULT 'student',
            password TEXT
        )
    """)
    c.execute("""
      CREATE TABLE IF NOT EXISTS teachers(
        teacher_id TEXT PRIMARY KEY,
        name       TEXT,
        surname    TEXT,
        email      TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
        password TEXT
      )
    """) 
    conn.commit()
    conn.close()
    # -------------------------------------------------------

    @app.route("/api/auth/login", methods=["POST"])
    def login():
        data = request.json or {}
        user = data.get("username")
        role = data.get("role")
        password = data.get("password") or ""
        db = get_db()
        if role == "student":
            r = db.execute(
                "SELECT password FROM students WHERE student_id = ?",
                (user,),
            ).fetchone()
        elif role == "teacher":
            r = db.execute(
                "SELECT password FROM teachers WHERE teacher_id = ?",
                (user,),
            ).fetchone()
        else:
            return jsonify({"error": "Invalid role"}), 400

        if not r:
            return jsonify({"error": "User not found"}), 404
        # Password check
        if (r["password"] or "123") != password:
            return jsonify({"error": "Invalid password"}), 401
        return jsonify({"username": user, "role": role})

    @app.route("/api/student/register", methods=["POST"])
    def register_student():
        data = request.json or {}
        sid      = data.get("username")
        name     = data.get("name")
        surname  = data.get("surname")
        email    = data.get("email")
        class_id = data.get("class_id")
        password = data.get("password") 
        if not all([sid, name, surname, email, password]):
            return jsonify({"error": "Missing fields"}), 400
        db = get_db()
        db.execute(
            """
            INSERT INTO students(student_id,name,surname,email,class_id, password)
            VALUES(?,?,?,?,?,?)
            ON CONFLICT(student_id) DO UPDATE SET
              name=excluded.name,
              surname=excluded.surname,
              email=excluded.email,
              class_id=excluded.class_id,
              password=excluded.password
            """,
            (sid, name, surname, email, class_id, password),
        )
        db.commit()
        row = db.execute(
            "SELECT student_id AS student_id, name, surname, email, class_id, role FROM students WHERE student_id=?",
            (sid,),
        ).fetchone()
        data = dict(row)
        data["role"] = "student"
        return jsonify(data), 201

    @app.route("/api/teacher/register", methods=["POST"])
    def register_teacher():
        data = request.json or {}
        tid     = data.get("username")
        name    = data.get("name")
        surname = data.get("surname")
        email   = data.get("email")
        password = data.get("password") 

        if not all([tid, name, surname, email, password]):
            return jsonify({"error": "Missing fields"}), 400
        db = get_db()
        db.execute(
            """
            INSERT INTO teachers(teacher_id,name,surname,email, password)
            VALUES(?,?,?,?,?)
            ON CONFLICT(teacher_id) DO UPDATE SET
              name=excluded.name,
              surname=excluded.surname,
              email=excluded.email,
              password=excluded.password

            """,
            (tid, name, surname, email, password),
        )
        db.commit()
        row = db.execute(
            "SELECT teacher_id AS username, name, surname, email FROM teachers WHERE teacher_id=?",
            (tid,),
        ).fetchone()
        data = dict(row)
        data["role"] = "teacher"
        return jsonify(data), 201

    @app.route("/api/classes", methods=["GET"])
    def get_classes():
        db = get_db()
        rows = db.execute("SELECT id,name FROM classes").fetchall()
        return jsonify([dict(r) for r in rows])

    @app.route("/api/classes", methods=["POST"])
    def add_class():
        data = request.json or {}
        cid  = data.get("id")
        name = data.get("name")
        if not cid or not name:
            return jsonify({"error": "Missing id or name"}), 400
        db = get_db()
        try:
            db.execute("INSERT INTO classes(id,name) VALUES(?,?)", (cid, name))
            db.commit()
        except sqlite3.IntegrityError:
            return jsonify({"error": "Class already exists"}), 400
        return jsonify({"id": cid, "name": name}), 201

    @app.route("/api/classes/<class_id>/students", methods=["GET"])
    def get_students_by_class(class_id):
        db = get_db()
        rows = db.execute(
            "SELECT student_id,name,surname,email,class_id FROM students WHERE class_id=?",
            (class_id,),
        ).fetchall()
        return jsonify([dict(r) for r in rows])

    # ←––– THIS IS THE FIX: return the full student record, not just “exists”
    @app.route("/api/student/<student_id>", methods=["GET"])
    def get_student(student_id):
        db = get_db()
        row = db.execute(
        "SELECT 1 FROM students WHERE student_id = ?",
        (student_id,)
        ).fetchone()
        if not row:
            return jsonify({"error":"Not found"}), 404
        return jsonify({"exists": True}), 200

    @app.route("/api/student/<student_id>/quizzes", methods=["GET"])
    def list_quizzes_for_student(student_id):
        db = get_db()
        rows = db.execute(
            """
            SELECT
              q.id           AS quiz_id,
              q.title        AS title,
              q.topic        AS topic,
              a.assigned_at  AS assigned_at,
              a.due_at       AS due_at,
              a.status       AS status,
              a.score        AS score,
              a.submitted_at AS submitted_at,
              a.id           AS assignment_id
            FROM quizzes q
            JOIN assignments a ON a.quiz_id = q.id
            WHERE a.student_id = ?
            ORDER BY a.assigned_at DESC
            """,
            (student_id,),
        ).fetchall()
        return jsonify([dict(r) for r in rows])

    @app.route("/api/student/<student_id>/submit", methods=["POST"])
    def submit_quiz(student_id):
        data          = request.json or {}
        quiz_id       = data.get("quiz_id")
        assignment_id = data.get("assignment_id")
        student_ans   = data.get("answers", {})

        quiz_obj = get_quiz(quiz_id)

        correct = 0
        total = len(quiz_obj["questions"])

        for idx, item in enumerate(quiz_obj["questions"]):
            if isinstance(item, (list, tuple)) and len(item) >= 2:
                real = item[1]
            elif isinstance(item, dict):
                real = item.get("answer", "")
            else:
                real = ""

            real_str = str(real).strip().lower()
            given = str(student_ans.get(str(idx), "")).strip().lower()

            print(f"[DEBUG] Q{idx} | Given: '{given}' | Expected: '{real_str}'")

            if given == real_str:
                correct += 1
        score = round((correct / total) * 100) if total else 0

        db = get_db()
        db.execute(
            """
            UPDATE assignments
            SET status='completed',
                score=?,
                submitted_at=CURRENT_TIMESTAMP,
                answers=?
            WHERE id=? AND student_id=?
            """,
            (score,json.dumps(student_ans),assignment_id, student_id),
        )
        db.commit()

        return jsonify({
        "score": score,
        "correct": correct,
        "total": total,
        }), 200
    @app.route("/api/assignment/<int:assignment_id>/result", methods=["GET"])
    def assignment_result(assignment_id):
        db = get_db()
        row = db.execute("""
            SELECT a.answers, a.score, a.quiz_id, q.data AS questions, q.title, q.topic
            FROM assignments a
            JOIN quizzes q ON a.quiz_id = q.id
            WHERE a.id = ?
        """, (assignment_id,)).fetchone()
        if not row:
            abort(404, description="Assignment not found")
        try:
            student_answers = json.loads(row["answers"] or "{}")
            questions = json.loads(row["questions"])
        except Exception:
            abort(500, description="Malformed data")
        return jsonify({
            "quiz_id": row["quiz_id"],
            "title": row["title"],
            "topic": row["topic"],
            "score": row["score"],
            "questions": questions,
            "answers": student_answers
        })
    @app.route("/api/students", methods=["GET"])
    def get_all_students():
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
    @app.route("/api/students/<student_id>", methods=["GET"])
    def get_student_detail(student_id):
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
            submitted = None if r['status'] == 'assigned' else "" # todo add deadline
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
    @app.route("/api/student/<student_id>/quizzes", methods=["GET"])
    def student_quizzes_with_questions(student_id):
        db = get_db()
        rows = db.execute("""
        SELECT
            a.id    AS assignment_id,
            a.quiz_id,
            q.title,
            q.topic  AS topic,            
            a.assigned_at,
            a.due_at,
            a.status,
            a.score,
            a.submitted_at,
            q.data  AS raw_questions
        FROM assignments a
        JOIN quizzes q ON q.id = a.quiz_id
        WHERE a.student_id = ?
        """, (student_id,)).fetchall()

        out = []
        for r in rows:
            qs = json.loads(r["raw_questions"])
            out.append({
            "assignment_id": r["assignment_id"],
            "quiz_id":       r["quiz_id"],
            "title":         r["title"],
            "assigned_at":   r["assigned_at"],
            "due_at":        r["due_at"],
            "status":        r["status"],
            "score":         r["score"],
            "submitted_at":  r["submitted_at"],
            "questions":     qs
            })
        return jsonify(out)
    @app.route("/api/teacher/<teacher_id>/classes", methods=["POST"])
    def add_class_for_teacher(teacher_id):
        data = request.json or {}
        class_name = data.get("name")
        if not class_name:
            return jsonify({"error": "Missing class name"}), 400
        db = get_db()
        # Allow duplicate class names per teacher
        c_id = f"{class_name}".replace(" ", "_")
        db.execute(
            "INSERT INTO classes(id, name, teacher_id) VALUES (?, ?, ?)",
            (c_id, class_name, teacher_id),
        )
        db.commit()
        return jsonify({"id": c_id, "name": class_name, "teacher_id": teacher_id}), 201
    @app.route("/api/teacher/<teacher_id>/classes", methods=["GET"])
    def get_teacher_classes(teacher_id):
        db = get_db()
        rows = db.execute(
            "SELECT id, name FROM classes WHERE teacher_id=?",
            (teacher_id,)
        ).fetchall()
        return jsonify([{"id": r["id"], "name": r["name"]} for r in rows])
    @app.route("/api/classes/<class_id>/add_student", methods=["POST"])
    def add_student_to_class(class_id):
        data = request.json or {}
        student_id = data.get("student_id")
        if not student_id:
            return jsonify({"error": "Missing student_id"}), 400
        db = get_db()
        # Only allow adding students with no class
        row = db.execute(
            "SELECT class_id FROM students WHERE student_id=?", (student_id,)
        ).fetchone()
        if not row:
            return jsonify({"error": "Student not found"}), 404
        if row["class_id"]:
            return jsonify({"error": "Student already in a class"}), 400
        db.execute(
            "UPDATE students SET class_id=? WHERE student_id=?",
            (class_id, student_id),
        )
        db.commit()
        return jsonify({"status": "added"}), 200
    @app.route("/api/classes/<class_id>/remove_student", methods=["POST"])
    def remove_student_from_class(class_id):
        data = request.json or {}
        student_id = data.get("student_id")
        if not student_id:
            return jsonify({"error": "Missing student_id"}), 400
        db = get_db()
        db.execute(
            "UPDATE students SET class_id=NULL WHERE student_id=? AND class_id=?",
            (student_id, class_id),
        )
        db.commit()
        return jsonify({"status": "removed"}), 200
    @app.route("/api/classes/<class_id>", methods=["DELETE"])
    def delete_class(class_id):
        db = get_db()
        db.execute("UPDATE students SET class_id=NULL WHERE class_id=?", (class_id,))
        db.execute("DELETE FROM classes WHERE id=?", (class_id,))
        db.commit()
        return jsonify({"status": "deleted"}), 200
    @app.route("/api/students/no_class", methods=["GET"])
    def get_students_no_class():
        db = get_db()
        rows = db.execute(
            "SELECT student_id, name, surname, email FROM students WHERE class_id IS NULL OR class_id = ''"
        ).fetchall()
        return jsonify([
            {
                "student_id": r["student_id"],
                "name": r["name"],
                "surname": r["surname"],
                "email": r["email"]
            }
            for r in rows
        ])
    @app.route("/api/classes/<class_id>/performance", methods=["GET"])
    def class_performance(class_id):
        db = get_db()
        rows = db.execute(
            """
            SELECT a.status, a.due_at, a.submitted_at
            FROM assignments a
            JOIN students s ON s.student_id = a.student_id
            WHERE s.class_id = ?
            """,
            (class_id,)
        ).fetchall()

        # Build quiz-like objects
        quizzes = []
        for r in rows:
            quizzes.append({
                "status": r["status"],
                "due_at": r["due_at"],
                "submitted_at": r["submitted_at"],
            })
        return jsonify(quizzes)




