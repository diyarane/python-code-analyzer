from flask import Flask, jsonify, render_template, request

from analyzer.ast_parser import analyze_code


app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


def _run_analyze():
    """Shared handler for /analyze and legacy /analyze-ast."""
    data = request.get_json(silent=True) or {}
    source_code = data.get("code", "")

    if not source_code.strip():
        return jsonify(
            {
                "success": False,
                "error": "EmptyCode",
                "message": "No Python code was provided.",
                "line": None,
            }
        ), 400

    result = analyze_code(source_code)
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
    app.run(host="127.0.0.1", port=5000, debug=True)
