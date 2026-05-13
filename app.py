from flask import Flask, jsonify, render_template, request

from ast_engine.ast_parser import parse_python_code


app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/analyze-ast", methods=["POST"])
def analyze_ast():
    """Parse editor code into AST JSON and return dashboard metrics."""
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

    result = parse_python_code(source_code)
    status_code = 200 if result.get("success") else 400
    return jsonify(result), status_code


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
