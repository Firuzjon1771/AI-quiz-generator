import os
from flask import request, jsonify
from werkzeug.utils import secure_filename
import fitz  # PyMuPDF
import docx

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'txt'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(filepath):
    text = ""
    doc = fitz.open(filepath)
    for page in doc:
        text += page.get_text()
    return text

def extract_text_from_docx(filepath):
    doc = docx.Document(filepath)
    return "\n".join([para.text for para in doc.paragraphs])

def extract_text_from_txt(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()

def handle_file_upload(app):
    @app.route("/api/upload", methods=["POST"])
    def upload_file():
        if "file" not in request.files:
            return jsonify({"error": "No file part"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "No selected file"}), 400

        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            save_path = os.path.join("uploads", filename)
            os.makedirs("uploads", exist_ok=True)
            file.save(save_path)

            ext = filename.rsplit(".", 1)[1].lower()

            try:
                if ext == "pdf":
                    text = extract_text_from_pdf(save_path)
                elif ext == "docx":
                    text = extract_text_from_docx(save_path)
                elif ext == "txt":
                    text = extract_text_from_txt(save_path)
                else:
                    return jsonify({"error": "Unsupported file type"}), 400

                return jsonify({"text": text})
            except Exception as e:
                return jsonify({"error": f"Failed to extract text: {str(e)}"}), 500

        return jsonify({"error": "Invalid file"}), 400
