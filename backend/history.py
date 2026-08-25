from flask import Blueprint, jsonify, request
from auth import get_current_user
from extensions import db
from models import AnalysisHistory

history_bp = Blueprint("history", __name__, url_prefix="/api/history")


@history_bp.route("", methods=["GET"])
def get_history():
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

    records = (
        AnalysisHistory.query.filter_by(user_id=user.id)
        .order_by(AnalysisHistory.created_at.desc())
        .limit(50)
        .all()
    )

    return jsonify({"success": True, "history": [r.to_dict() for r in records]}), 200


@history_bp.route("", methods=["POST"])
def save_history():
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

    data = request.get_json(silent=True) or {}
    source_code = data.get("source_code", "")
    analysis_result = data.get("analysis_result")
    title = data.get("title", "")

    if not source_code or not analysis_result:
        return (
            jsonify({"success": False, "error": "Missing source code or analysis data."}),
            400,
        )

    # Infer title if empty
    if not title:
        first_line = source_code.strip().split("\n")[0][:40]
        title = first_line if first_line else "Python Snippet"

    record = AnalysisHistory(
        user_id=user.id,
        title=title,
        source_code=source_code,
        analysis_result=analysis_result,
    )

    db.session.add(record)
    db.session.commit()

    return jsonify({"success": True, "item": record.to_dict()}), 201


@history_bp.route("/<int:history_id>", methods=["GET"])
def get_history_item(history_id: int):
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

    # Ownership check: user_id must match authenticated user
    record = AnalysisHistory.query.filter_by(
        id=history_id, user_id=user.id
    ).first()

    if not record:
        return jsonify({"success": False, "error": "Record not found."}), 404

    return jsonify({"success": True, "item": record.to_dict()}), 200


@history_bp.route("/<int:history_id>", methods=["DELETE"])
def delete_history_item(history_id: int):
    user = get_current_user()
    if not user:
        return jsonify({"success": False, "error": "Authentication required."}), 401

    # Ownership check: user_id must match authenticated user
    record = AnalysisHistory.query.filter_by(
        id=history_id, user_id=user.id
    ).first()

    if not record:
        return jsonify({"success": False, "error": "Record not found."}), 404

    db.session.delete(record)
    db.session.commit()

    return jsonify({"success": True, "message": "Record deleted."}), 200
