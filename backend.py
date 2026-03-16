from flask import Flask, request, jsonify

from analyzer import analyze_source


app = Flask(__name__)


# CORS: allow frontend (e.g. served on port 8000) to call this API on port 5000.
# Do not add a homepage route; this app is API-only.
@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


@app.route("/analyze", methods=["POST", "OPTIONS"])
def analyze():
    """
    Accept a Python file upload, run static analysis using the existing
    AST-based analyzer, and return the report as JSON.
    The uploaded file is never saved to disk.
    """
    # CORS preflight: browser sends OPTIONS before POST from another origin
    if request.method == "OPTIONS":
        return "", 204

    # 1) Basic validation: ensure a file part is present
    upload = request.files.get("file")
    if upload is None:
        return jsonify({"error": "No file part 'file' in request"}), 400

    # 2) Ensure the client actually selected a file
    if not upload.filename:
        return jsonify({"error": "No file selected"}), 400

    # 3) Check file extension (only .py is allowed)
    if not upload.filename.lower().endswith(".py"):
        return jsonify({"error": "Only .py files are accepted"}), 400

    # 4) Read file content into memory only (do not save to disk)
    raw_bytes = upload.read()
    if not raw_bytes:
        return jsonify({"error": "Uploaded file is empty"}), 400

    # 5) Decode safely as UTF-8
    try:
        source_code = raw_bytes.decode("utf-8")
    except UnicodeDecodeError:
        return jsonify({"error": "File must be UTF-8 encoded"}), 400

    # 6) Run static analysis using the existing analyzer (AST-based)
    #    We NEVER execute the uploaded code; we only parse and inspect it.
    try:
        report_text = analyze_source(source_code)
    except SyntaxError as e:
        # Invalid Python syntax in the uploaded file
        return jsonify(
            {
                "error": "Syntax error in uploaded Python file",
                "details": str(e),
            }
        ), 400
    except Exception as e:
        # Catch-all for unexpected analyzer errors
        return jsonify(
            {
                "error": "Internal analysis error",
                "details": str(e),
            }
        ), 500

    # 7) Return the analysis report as JSON.
    #    Keeping it as a single text block makes it easy to display in a UI.
    return jsonify({"report": report_text}), 200


if __name__ == "__main__":
    # Simple dev server for local testing.
    # In production, use a WSGI server (gunicorn, uWSGI, etc.).
    app.run(host="127.0.0.1", port=5000, debug=True)

