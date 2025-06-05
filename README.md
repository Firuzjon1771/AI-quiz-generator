# AI Quiz Generator

A web application that automatically generates training quizzes from text using modern NLP techniques. The frontend is built with React, and the backend is powered by Flask (Python) with a SQLite database. In CLI mode, the backend can also run as a standalone script for quick prototyping.

---

## Table of Contents

1. [Project Overview](#project-overview)  
2. [Features](#features)  
3. [Architecture & Technologies](#architecture--technologies)  
4. [Getting Started](#getting-started)  
   - [Prerequisites](#prerequisites)  
   - [Installation](#installation)  
   - [Environment Variables](#environment-variables)  
   - [Database Initialization](#database-initialization)  
5. [Running the Application](#running-the-application)  
   - [Backend (Flask)](#backend-flask)  
   - [Frontend (React)](#frontend-react)  
   - [CLI Mode](#cli-mode)  
6. [API Reference](#api-reference)  
7. [Frontend Guide](#frontend-guide)  
8. [Project Structure](#project-structure)  
9. [Future Improvements](#future-improvements)  
10. [Contributing](#contributing)  
11. [License](#license)  

---

## Project Overview

Many educators spend hours manually creating quizzes and evaluating student answers. This project—**AI Quiz Generator**—leverages NLP pipelines and transformer models to automate the creation of quizzes from any text or topic. Teachers can upload text passages or specify topics/keywords, and the system will:

1. Detect the main topic (using TF-IDF + spaCy).  
2. Generate open-ended and multiple-choice questions (via FLAN-T5 templates).  
3. Store quizzes and questions in a SQLite database.  
4. Allow assignment of quizzes to classes/students.  
5. Automatically grade student submissions and display detailed results.

All of this happens in a fully offline, CPU-only prototype. A React-based Single Page Application (SPA) provides an intuitive interface for both teachers and students.

---

## Features

- **Automatic Quiz Generation**  
  - Topic detection (TF-IDF + spaCy).  
  - Question templates (50+ built-in prompts) filled via FLAN-T5.  
  - Option to generate both open-ended and multiple-choice questions.  
  - Simple “correction probe” via a lightweight GPT-2 model (for future feedback).

- **User Authentication & Roles**  
  - Teacher and Student accounts (bcrypt-hashed passwords).  
  - Role-based access control:  
    - Teachers can create/edit quizzes, assign quizzes, and view class results.  
    - Students can view assigned quizzes, submit answers, and see feedback.

- **Quiz Management**  
  - Save generated quizzes.  
  - Assign quizzes to classes or individual students.  
  - View and edit existing quizzes (title, questions).

- **Automated Grading**  
  - Matches student answers against stored correct answers.  
  - Stores results with timestamp and calculates a score.  
  - Provides feedback (JSON + graphical charts in the UI).

- **Data Persistence**  
  - SQLite database (no external dependencies).  
  - Tables: `teachers`, `students`, `classes`, `quizzes`, `questions`, `assignments`, `results`.

- **React SPA**  
  - Modern, responsive UI (React 18 + Tailwind CSS).  
  - Recharts for graphical results.  
  - React Router for navigation (Dashboard, Quizzes, Results, Classes, etc.).  
  - Toast notifications for feedback.

- **CLI Mode (Offline Prototype)**  
  - Run `python app.py --input path/to/text.txt --num-questions 10` to generate questions in console.  
  - No web server required—ideal for quick prototyping or offline use.

---

## Architecture & Technologies

### Backend (Python / Flask)

- **Flask**  
  Lightweight web framework for RESTful APIs.  
- **SQLite**  
  Zero-configuration, file-based relational database (stored in `quizzes.db`).  
- **spaCy**  
  Tokenization & NLP pipelines (topic detection).  
- **scikit-learn**  
  TF–IDF vectorizer for keyword extraction.  
- **Transformers (FLAN-T5)**  
  Hugging Face’s T5 model for question generation.  
- **passlib (bcrypt)**  
  Secure password hashing.  
- **Flask-CORS**  
  Cross-Origin Resource Sharing (allow React frontend to talk to Flask).  
- **Flask-Limiter (planned)**  
  Rate limiting for login attempts (future work).  

### Frontend (JavaScript / React)

- **React 18**  
  Component-based UI library.  
- **Tailwind CSS**  
  Utility-first CSS framework for responsive design.  
- **React Router DOM**  
  Client-side routing between pages.  
- **Axios**  
  Promise-based HTTP client for API calls.  
- **Recharts**  
  Charting library for quiz result visualization.  
- **React-Toastify**  
  Toast notifications for success/warnings/errors.  
- **React-Select**  
  Enhanced dropdowns / multi-select for keywords.  
- **Heroicons / Lucide / Shadcn / Framer Motion**  
  Icons and animations for polished UI/UX.  

---

## Getting Started

### Prerequisites

- **Node.js & npm** (v16.x or newer)  
- **Python 3.10+**  
- **Git** (to clone this repo)

### Installation

1. **Clone the repository**  
   ```bash
   git clone https://github.com/your-username/ai-quiz-generator.git
   cd ai-quiz-generator
   ```

2. **Backend Setup**  
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate    # on Windows: .\venv\Scripts\activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
   - The `requirements.txt` file includes:  
     ```
     Flask
     flask-cors
     spacy
     sklearn
     torch
     transformers
     passlib[bcrypt]
     tensorflow   # if using TF-based T5
     ```
   - Install spaCy en_core_web_sm model (if not already installed):
     ```bash
     python -m spacy download en_core_web_sm
     ```

3. **Frontend Setup**  
   ```bash
   cd ../frontend
   npm install
   ```

### Environment Variables

Create a `.env` file in the `backend/` directory (optional—for production/online deployment):

```ini
SECRET_KEY=your_flask_secret_key
JWT_SECRET_KEY=your_jwt_secret
DATABASE_URL=sqlite:///quizzes.db
```

> **Note**: For local development & CLI mode, environment variables are optional. The SQLite database (`quizzes.db`) will be created automatically if it doesn’t exist.

---

## Database Initialization

On first run, the backend will automatically check for `backend/quizzes.db` and create necessary tables if missing (using initialization code in `app.py`). If you’d rather inspect the schema, the relevant tables are:

- `teachers (teacher_id, name, surname, email, created_at)`
- `students (student_id, name, surname, email, role, password, class_id, created_at)`
- `classes (class_id, name, teacher_id, created_at)`
- `quizzes (quiz_id, class_id, topic, title, questions JSON, created_at)`
- `questions (question_id, quiz_id, text, expected_answer, type)`
- `assignments (assignment_id, quiz_id, class_id, deadline)`
- `results (result_id, assignment_id, student_id, score, submitted_at)`

You do **not** need to run any migrations manually; simply start the backend once and let it bootstrap the database.

---

## Running the Application

### Backend (Flask)

From the `backend/` folder, activate your virtual environment and run:

```bash
source venv/bin/activate      # or .\venv\Scripts\activate on Windows
python app.py
```

- The server will start on `http://127.0.0.1:5000/` in **debug** mode by default.
- All REST endpoints (authentication, quiz generation, assignments, grading, etc.) will be available under `/api/...`.

#### Key Endpoints

1. **Authentication & Users**  
   - `POST /api/register`  
     Request body:
     ```json
     {
       "username": "teacher1",
       "password": "supersecret",
       "role": "teacher"
     }
     ```  
   - `POST /api/login`  
     Request body:
     ```json
     {
       "username": "teacher1",
       "password": "supersecret"
     }
     ```  
     - Returns a session cookie or JWT token containing `{ user_id, role }`.

2. **Topic Detection & Quiz Generation**  
   - `POST /api/detect`  
     Request body:
     ```json
     { "text": "Paste your passage here..." }
     ```  
     - Returns detected `{ primary, scores }`.
   - `POST /api/quiz/generate` (auto-detect branch)  
     Request body:
     ```json
     {
       "text": "...",
       "topic": "DetectedTopic",
       "openCount": 5,
       "mcCount": 5
     }
     ```  
     - Returns `{ questions: [ ... ] }`.

3. **Quiz Management**  
   - `POST /api/quizzes`  
     Request body:
     ```json
     {
       "title": "Quiz Title",
       "questions": [ { "text": "...", "expected_answer": "...", "type": "open" }, ... ],
       "class_id": "class123",
       "topic": "Indexing"
     }
     ```  
     - Returns `{ quiz_id: 1 }`.
   - `GET /api/quizzes`  
     - Returns a JSON array of all quizzes with metadata:
       ```json
       [ { "quiz_id": 1, "title": "Quiz Title", "topic": "...", "created_at": "..." }, ... ]
       ```

4. **Assignments**  
   - `POST /api/assignments`  
     Request body:
     ```json
     {
       "quiz_id": 1,
       "class_id": "class123",
       "deadline": "2025-07-01T23:59:00"
     }
     ```  
     - Returns `{ assignment_id: 42 }`.
   - `GET /api/assignments?class_id=class123`  
     - Returns a list of assignments for that class.

5. **Students & Classes**  
   - `GET /api/classes`  
     - Returns `[ { "class_id": "class123", "students": [ { "student_id": "stu1", "name": "Alice" }, ... ] }, ... ]`.
   - `POST /api/classes` to create a new class:
     ```json
     { "name": "CS101", "teacher_id": "teacher1" }
     ```  
     - Returns `{ class_id: "class123" }`.
   - `POST /api/students` to add a student:
     ```json
     {
       "student_id": "stu1",
       "name": "Alice",
       "email": "alice@example.com",
       "class_id": "class123"
     }
     ```  
     - Returns `{ student_id: "stu1" }`.

6. **Grading & Results**  
   - `POST /api/grade`  
     Request body:
     ```json
     {
       "assignment_id": 42,
       "student_id": "stu123",
       "answers": [ { "question_id": 101, "answer": "..." }, ... ]
     }
     ```  
     - The backend retrieves `expected_answer` for each `question_id`, compares (case-insensitive), calculates a `score` (correct/total × 100), and inserts a new row in `results`.
     - Returns:
       ```json
       {
         "score": 80,
         "feedback": [
           { "question_id": 101, "correct": true },
           ...
         ]
       }
       ```
   - `GET /api/results?student_id=stu123`  
     - Returns that student’s past quiz results and aggregate statistics.

7. **Topic/KW Management**  
   - `GET /api/topics`  
     - Returns a JSON object mapping built-in topics → array of keywords.
   - `POST /api/topics/add`  
     Request body:
     ```json
     {
       "topic": "NewTopic",
       "keywords": ["kw1", "kw2", "..." ]
     }
     ```  
     - Updates the in-memory topics JSON (persisted to disk as `topic_keywords_100plus_expanded.json`).

---

### Frontend (React)

From the `frontend/` folder:

```bash
npm install
npm start
```

- The React app opens at `http://localhost:3000/`.  
- The frontend uses Axios defaults pointing to `http://localhost:5000/api`.  If needed, modify `src/utils/api.js`.
- Protected routes redirect to `/login` if not authenticated.

#### Major React Components

- **`App.jsx`**: Main entry—sets up React Router and layout (Navbar, routes).  
- **`UploadForm.jsx`**: Teachers paste text or upload a file, toggle “Auto-detect topic,” or select built-in topic → click “Generate” → sends to `/api/quiz/generate`.  
- **`QuizDashboard.jsx`**: Lists quizzes, allows editing/deletion.  
- **`QuestionReview.jsx`**: Approve/discard generated questions before saving a quiz.  
- **`QuizEditor.jsx`**: Edit saved quiz questions.  
- **`ClassView.jsx` / `ClassStudentList.jsx`**: Manage classes and students.  
- **`StudentQuiz.jsx`**: Students see assigned quizzes.  
- **`QuizTake.jsx`**: Students answer questions and submit to `/api/grade`.  
- **`QuizResult.jsx`**: Displays the student’s score and charts (Recharts).

---

## CLI Mode

For an offline prototype without HTTP:

```bash
cd backend
source venv/bin/activate
python main.py
```

Then follow console prompts:

1. Enter path to a text file (e.g., `sample.txt`).  
2. The `TopicDetector` identifies a topic and prints it with a preview.  
3. `QuestionGenerator` (FLAN-T5) generates 10 questions.  
4. Results appear in console.

Example invocation:

```bash
python main.py
```

Output:

```
Detected Topic: Computer Networking
Content preview: "Computer networks interconnect devices..."
1. [Open] Q: What is a router?  
   A: A router is a networking device that...
...
```

---

## API Reference

The backend provides the following endpoints:

| Path                     | Method | Input                                      | Output                                    | Purpose                                           |
|--------------------------|--------|--------------------------------------------|-------------------------------------------|---------------------------------------------------|
| `/api/register`          | POST   | `{ username, password, role }`             | `{ user_id, message }`                    | Create new user (teacher or student)              |
| `/api/login`             | POST   | `{ username, password }`                   | `{ token, role }` or session cookie       | Authenticate and obtain token/cookie              |
| `/api/detect`            | POST   | `{ text }`                                 | `{ primary, scores }`                     | Detect main topic using TF-IDF + spaCy            |
| `/api/quiz/generate`     | POST   | `{ text, topic, openCount, mcCount }`      | `{ questions: [ ... ] }`                  | Generate open-ended and MC questions (FLAN-T5)    |
| `/api/quizzes`           | POST   | `{ title, questions[], class_id, topic }`  | `{ quiz_id }`                             | Save a new quiz                                   |
| `/api/quizzes`           | GET    | –                                          | `[ { quiz_id, title, topic, created_at } ]` | List all quizzes                                 |
| `/api/assignments`       | POST   | `{ quiz_id, class_id, deadline }`          | `{ assignment_id }`                       | Assign a quiz to a class                          |
| `/api/assignments`       | GET    | `?class_id=...`                            | `[ { assignment_id, quiz_id, deadline } ]` | List assignments for a class                      |
| `/api/classes`           | GET    | –                                          | `[ { class_id, students: [ ... ] } ]`     | List all classes with students                    |
| `/api/students`          | POST   | `{ student_id, name, email, class_id }`    | `{ student_id }`                          | Add a new student                                 |
| `/api/grade`             | POST   | `{ assignment_id, student_id, answers[] }` | `{ score, feedback: [ ... ] }`            | Grade student quiz submissions                    |
| `/api/results`           | GET    | `?student_id=...`                          | `[ { assignment_id, score, submitted_at } ]` | Get a student’s quiz results                      |
| `/api/topics`            | GET    | –                                          | `{ topic: [ keywords ] }`                 | Retrieve built-in topics and keywords             |
| `/api/topics/add`        | POST   | `{ topic, keywords[] }`                    | `{ message }`                             | Add or update topic-keyword mapping                |

---

## Frontend Guide

### Initial Setup

Edit `src/utils/api.js` if the backend URL differs (default: `http://localhost:5000/api`).

### Authentication Flow

1. **Registration**: Teacher or Student navigates to `/register` and fills out the form.  
2. **Login**: `/login` accepts credentials; on success, stores token in `localStorage` and redirects to Dashboard.

### Teacher Dashboard

- **Dashboard (`/dashboard`)**: Shows overview: number of quizzes, assignments, classes.  
- **Quizzes (`/quizzes`)**:  
  - “Create Quiz” → navigates to `/quizzes/new`.  
  - Displays list of saved quizzes with “Edit” and “Assign” buttons.  
- **Create / Generate Quiz**: `/quizzes/new`  
  - The `UploadForm` component:  
    - Textarea to paste content or “Choose File.”  
    - Toggle “Auto-detect topic.”  
    - If toggled on: backend endpoint `/api/detect` returns keyword suggestions.  
    - If toggled off: a select dropdown of built-in topics + checkbox list of keywords.  
    - Slider to choose total questions (open vs. MC).  
    - “Generate” button sends data to `/api/quiz/generate`.  
    - Generated questions appear in `QuestionReview` for modification.  
    - “Save Quiz” sends final JSON to `/api/quizzes`.  
- **Edit Quiz**: `/quizzes/:quiz_id/edit`  
  - `QuizEditor` shows existing questions, allows reordering, text edits, adding/removing options.  

### Class & Student Management

- **Classes (`/classes`)**:  
  - `ClassView` lists all classes; “Add Class” button opens a modal to create a new class.  
  - Click class name → `ClassStudentList`: list of students; “Add Student” for new student.  
  - Remove student or update email in-line.  

### Student Dashboard

- **Assigned Quizzes (`/student/quizzes`)**:  
  - `StudentQuiz` lists assignments (with deadlines).  
  - Click “Start Quiz” → `/student/quizzes/:assignment_id` loads `QuizTake`.  
- **Quiz Take (`/student/quizzes/:assignment_id`)**:  
  - Displays one question at a time; “Next” to advance.  
  - At end, “Submit” sends to `/api/grade`.  
  - Show loading spinner during grading.  
- **Results (`/student/results`)**:  
  - `QuizResult` shows a summary of all quizzes taken, with bar chart of scores.  
  - Click individual quiz to see detailed score breakdown.

---

## Project Structure

```
ai-quiz-generator/
├── backend/
│   ├── app.py
│   ├── main.py
│   ├── topic_detection.py
│   ├── question_generation.py
│   ├── answer_postprocessor.py
│   ├── correction_probe.py
│   ├── summarizer.py
│   ├── upload_handler.py
│   ├── models/               
│   │   ├── classes.py
│   │   ├── students.py
│   │   ├── quizzes.py
│   │   ├── questions.py
│   │   ├── assignments.py
│   │   ├── results.py
│   ├── routes/               
│   │   ├── quiz_routes.py     
│   │   ├── student_routes.py   
│   │   ├── util_routes.py     
│   │   ├── class_students.py   
│   ├── scripts/               
│   │   └── db_schema.sql
│   ├── data/                  
│   │   └── topic_keywords_100plus_expanded.json
│   ├── quizzes.db   ← SQLite DB generated on first run  
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   ├── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── App.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── UploadForm.jsx
│   │   │   ├── QuestionReview.jsx
│   │   │   ├── QuizEditor.jsx
│   │   │   ├── QuizDashboard.jsx
│   │   │   ├── ClassView.jsx
│   │   │   ├── ClassStudentList.jsx
│   │   │   ├── StudentQuiz.jsx
│   │   │   ├── QuizTake.jsx
│   │   │   └── QuizResult.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Quizzes.jsx
│   │   │   ├── Results.jsx
│   │   │   ├── Classes.jsx
│   │   │   ├── Students.jsx
│   ├── styles/
│   │   └── App.css
│   ├── README.md
│   └── package.json
├── .gitignore
└── README.md
```

---

## Future Improvements

- **Migrate API to FastAPI**:  
  - Built-in OpenAPI docs.  
  - Native async support.  
- **Add Rate Limiting** (Flask-Limiter) to prevent brute-force attacks.  
- **Integrate Docker**:  
  - Dockerfile + docker-compose for easy deployment.  
- **Automated Evaluation**:  
  - Add `/api/evaluate` endpoint for BLEU/ROUGE/METEOR/BERTScore.  
  - Build interactive charts in React.  
- **User Analytics**:  
  - Track detailed logs (who generated what, when).  
- **Scalability**:  
  - Switch SQLite → PostgreSQL for production.  
  - Deploy on cloud (AWS, GCP, or Heroku).  

---

## Contributing

1. Fork the repo.  
2. Create a new branch: `git checkout -b feature/your-feature`.  
3. Make changes and commit: `git commit -m "Add new feature"`.  
4. Push to your branch: `git push origin feature/your-feature`.  
5. Open a Pull Request.  

Please ensure code is well-documented and tests (if any) pass before submitting.

---

## License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.
