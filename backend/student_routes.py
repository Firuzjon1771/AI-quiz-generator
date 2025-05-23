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
    """
    Fetches a quiz by ID from the `quizzes` table and parses its JSON data
    into a list of (question_text, correct_answer) tuples.
    """
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
            name TEXT NOT NULL
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS students(
            student_id TEXT PRIMARY KEY
            -- other columns to be added below
        )
    """)
    c.execute("""
      CREATE TABLE IF NOT EXISTS teachers(
        teacher_id TEXT PRIMARY KEY,
        name       TEXT,
        surname    TEXT,
        email      TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    """)
    cols = [row[1] for row in c.execute("PRAGMA table_info(students)").fetchall()]
    if 'name' not in cols:
        c.execute("ALTER TABLE students ADD COLUMN name TEXT")                
    if 'surname' not in cols:
        c.execute("ALTER TABLE students ADD COLUMN surname TEXT")              
    if 'email' not in cols:
        c.execute("ALTER TABLE students ADD COLUMN email TEXT")              
    if 'class_id' not in cols:
        c.execute("ALTER TABLE students ADD COLUMN class_id TEXT DEFAULT 'A'")

    for cls_id, cls_name in [('A','Class A'),('B','Class B'),('C','Class C'),('D','Class D')]:
        c.execute("INSERT OR IGNORE INTO classes(id,name) VALUES(?,?)",(cls_id,cls_name))
    c.execute("UPDATE students SET class_id = 'A' WHERE class_id IS NULL OR class_id = ''")   
    conn.commit()
    conn.close()
    # -------------------------------------------------------

    @app.route("/api/auth/login", methods=["POST"])
    def login():
        data = request.json or {}
        user = data.get("username")
        role = data.get("role")
        db = get_db()
        if role == "student":
            r = db.execute(
                "SELECT 1 FROM students WHERE student_id = ?",
                (user,),
            ).fetchone()
        elif role == "teacher":
            r = db.execute(
                "SELECT 1 FROM teachers WHERE teacher_id = ?",
                (user,),
            ).fetchone()
        else:
            return jsonify({"error": "Invalid role"}), 400

        if not r:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"username": user, "role": role})

    @app.route("/api/student/register", methods=["POST"])
    def register_student():
        data = request.json or {}
        sid      = data.get("username")
        name     = data.get("name")
        surname  = data.get("surname")
        email    = data.get("email")
        class_id = data.get("class_id")
        if not all([sid, name, surname, email, class_id]):
            return jsonify({"error": "Missing fields"}), 400
        db = get_db()
        db.execute(
            """
            INSERT INTO students(student_id,name,surname,email,class_id)
            VALUES(?,?,?,?,?)
            ON CONFLICT(student_id) DO UPDATE SET
              name=excluded.name,
              surname=excluded.surname,
              email=excluded.email,
              class_id=excluded.class_id
            """,
            (sid, name, surname, email, class_id),
        )
        db.commit()
        row = db.execute(
            "SELECT student_id AS student_id, name, surname, email, class_id, role FROM students WHERE student_id=?",
            (sid,),
        ).fetchone()
        return jsonify(dict(row)), 201

    @app.route("/api/teacher/register", methods=["POST"])
    def register_teacher():
        data = request.json or {}
        tid     = data.get("username")
        name    = data.get("name")
        surname = data.get("surname")
        email   = data.get("email")
        if not all([tid, name, surname, email]):
            return jsonify({"error": "Missing fields"}), 400
        db = get_db()
        db.execute(
            """
            INSERT INTO teachers(teacher_id,name,surname,email)
            VALUES(?,?,?,?)
            ON CONFLICT(teacher_id) DO UPDATE SET
              name=excluded.name,
              surname=excluded.surname,
              email=excluded.email
            """,
            (tid, name, surname, email),
        )
        db.commit()
        row = db.execute(
            "SELECT teacher_id AS username, name, surname, email FROM teachers WHERE teacher_id=?",
            (tid,),
        ).fetchone()
        return jsonify(dict(row)), 201

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
    @app.route("/api/students/<student_id>", methods=["GET"])
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