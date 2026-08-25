from __future__ import annotations

import logging
import os
import sys

from flask_socketio import SocketIO, emit

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from analyzer.ast_parser import analyze_code
from analyzer.cache import get_cached_analysis, set_cached_analysis

logger = logging.getLogger(__name__)

socketio = SocketIO()


def init_socketio(app):
    """Initialize Flask-SocketIO with cross-origin support."""
    socketio.init_app(app, cors_allowed_origins="*", async_mode="gevent")
    return socketio


@socketio.on("connect")
def handle_connect():
    emit("connected", {"status": "connected"})


@socketio.on("start_analysis")
def handle_start_analysis(data):
    """Handle real-time analysis requests over WebSockets."""
    data = data or {}
    source_code = data.get("code", "")
    language = data.get("language")
    filename = data.get("filename")

    def send_progress(stage: str, payload: dict | None = None):
        emit("analysis_progress", {"stage": stage, "data": payload or {}})

    send_progress("analysis_started")

    if not source_code.strip():
        err_res = {
            "success": False,
            "error": "EmptyCode",
            "message": "No code was provided.",
            "line": None,
            "cached": False,
        }
        send_progress("analysis_error", err_res)
        return

    send_progress("cache_check")
    cache_key = f"{language or 'auto'}:{filename or ''}:{source_code}"
    cached_result = get_cached_analysis(cache_key)

    if cached_result is not None:
        send_progress("cache_hit")
        send_progress("analysis_completed", cached_result)
        return

    def on_progress_step(stage: str, step_data: dict):
        send_progress(stage, step_data)

    result = analyze_code(
        source_code,
        progress_callback=on_progress_step,
        language=language,
        filename=filename,
    )
    result["cached"] = False

    if result.get("success"):
        set_cached_analysis(cache_key, result)
        send_progress("analysis_completed", result)
    else:
        send_progress("analysis_error", result)
