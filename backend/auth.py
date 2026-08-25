import re
from flask import Blueprint, jsonify, request, session
from extensions import db
from models import User

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# Strict RFC TLD Email Format Regex (requires local, @, domain, and TLD)
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


def get_current_user() -> User | None:
    """Helper to fetch the currently authenticated user from session."""
    user_id = session.get("user_id")
    if not user_id:
        return None
    return User.query.get(user_id)


# ==============================================================================
# Architectural Placeholders for Future Email Delivery Provider Integration
# (Will be connected to SendGrid / AWS SES / Postmark for email verification & reset)
# ==============================================================================

def send_verification_email(user_email: str) -> bool:
    """
    Architectural placeholder for sending email verification codes/links.
    Note: Format validation is enforced during signup, but email ownership
    verification will be triggered via this placeholder when an email service is configured.
    """
    print(f"[EmailService Stub] Verification email queued for: {user_email}")
    return True


def reset_password_request(user_email: str) -> bool:
    """Architectural placeholder for password reset link generation and delivery."""
    print(f"[EmailService Stub] Password reset request queued for: {user_email}")
    return True


# ==============================================================================
# Authentication Endpoints
# ==============================================================================

@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    # 1. Format Validation (Strict TLD requirement)
    if not email or not EMAIL_REGEX.match(email):
        return jsonify({"success": False, "error": "Invalid email format. Please provide a valid address (e.g. user@example.com)."}), 400

    # 2. Reject malformed domains (e.g. developer@., developer@example without TLD)
    parts = email.split("@")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        return jsonify({"success": False, "error": "Malformed email address structure."}), 400

    domain = parts[1]
    if "." not in domain or domain.startswith(".") or domain.endswith("."):
        return jsonify({"success": False, "error": "Invalid email domain format."}), 400

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

    # 3. Case-insensitive Uniqueness Check
    existing_user = User.query.filter(db.func.lower(User.email) == email).first()
    if existing_user:
        return (
            jsonify({"success": False, "error": "Email address already registered."}),
            400,
        )

    user = User(email=email)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    # Trigger architectural email verification placeholder
    send_verification_email(email)

    session["user_id"] = user.id
    session.permanent = True

    return jsonify({"success": True, "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not email or not password:
        return jsonify({"success": False, "error": "Email address and password are required."}), 400

    if not EMAIL_REGEX.match(email):
        return jsonify({"success": False, "error": "Invalid email address format."}), 400

    # Case-insensitive query
    user = User.query.filter(db.func.lower(User.email) == email).first()

    if not user or not user.check_password(password):
        return jsonify({"success": False, "error": "Invalid email address or password."}), 401

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
