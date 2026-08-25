import os
import sys
from flask import Flask, jsonify, render_template, request, send_from_directory

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from analyzer.ast_parser import analyze_code
from analyzer.cache import get_cached_analysis, set_cached_analysis
from socket_events import init_socketio, socketio

DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist"))

if os.path.exists(DIST_DIR):
    app = Flask(__name__, static_folder=os.path.join(DIST_DIR, "assets"), static_url_path="/assets")
else:
    app = Flask(__name__)

init_socketio(app)


@app.route("/")
def index():
    if os.path.exists(os.path.join(DIST_DIR, "index.html")):
        return send_from_directory(DIST_DIR, "index.html")
    return "CodeAnalyzer AI Backend API is running."


def _run_analyze():
    """Shared handler for /analyze and legacy /analyze-ast (HTTP fallback)."""
    data = request.get_json(silent=True) or {}
    source_code = data.get("code", "")

    if not source_code.strip():
        return jsonify(
            {
                "success": False,
                "error": "EmptyCode",
                "message": "No Python code was provided.",
                "line": None,
                "cached": False,
            }
        ), 400

    cached_result = get_cached_analysis(source_code)
    if cached_result is not None:
        return jsonify(cached_result), 200

    result = analyze_code(source_code)
    result["cached"] = False

    if result.get("success"):
        set_cached_analysis(source_code, result)

    status_code = 200 if result.get("success") else 400
    return jsonify(result), status_code


@app.route("/analyze", methods=["POST"])
def analyze():
    """Parse code from the editor: AST JSON + metrics + explanations."""
    return _run_analyze()


@app.route("/analyze-ast", methods=["POST"])
def analyze_ast():
    """Backward-compatible alias for older clients."""
    return _run_analyze()


if __name__ == "__main__":
    socketio.run(app, host="127.0.0.1", port=5000, debug=True)
