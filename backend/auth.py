import re
from flask import Blueprint, jsonify, request, session
from extensions import db
from models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_REGEX = re.compile(r"^[^@]+@[^@]+\.[^@]+$")


def get_current_user() -> User | None:
    """Helper to fetch the currently authenticated user from session."""
    user_id = session.get("user_id")
    if not user_id:
        return None
    return User.query.get(user_id)


@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not EMAIL_REGEX.match(email):
        return jsonify({"success": False, "error": "Invalid email address."}), 400

    if len(password) < 8:
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Password must be at least 8 characters long.",
                }
            ),
            400,
        )

    if User.query.filter_by(email=email).first():
        return (
            jsonify({"success": False, "error": "Email address already registered."}),
            400,
        )

    user = User(email=email)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    session["user_id"] = user.id
    session.permanent = True

    return jsonify({"success": True, "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not password:
        return jsonify({"success": False, "error": "Email and password required."}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({"success": False, "error": "Invalid email or password."}), 401

    session["user_id"] = user.id
    session.permanent = True

    return jsonify({"success": True, "user": user.to_dict()}), 200


@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Signed out successfully."}), 200


@auth_bp.route("/me", methods=["GET"])
def me():
    user = get_current_user()
    if not user:
        return jsonify({"authenticated": False, "user": None}), 401
    return jsonify({"authenticated": True, "user": user.to_dict()}), 200
