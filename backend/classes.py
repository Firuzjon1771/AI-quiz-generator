from flask import Blueprint, jsonify

classes_bp = Blueprint('classes', __name__)

@classes_bp.route('/api/classes', methods=['GET'])
def get_classes():
    classes = [
        { "id": "class1", "name": "10A - Intro to CS" },   # ⬅️ example entry
        { "id": "class2", "name": "11B - Data Science" }
    ]
    return jsonify(classes)
