"""
Main entry point for multi-language AST analysis.

Delegates detection to LanguageDetectionService and analysis to registered language adapters.
Maintains 100% backward compatibility for Python source analysis.
"""

from __future__ import annotations

import traceback
from typing import Any, Callable, Dict, Optional
from .detection import detector
from .registry import registry


def analyze_code(
    source_code: str,
    progress_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    language: Optional[str] = None,
    filename: Optional[str] = None,
) -> dict:
    """
    Main entry for POST /analyze and WebSocket execution.

    Detects language via LanguageDetectionService, looks up adapter, and runs analysis.
    Returns a dict suitable for jsonify().
    """
    def _notify(stage: str, data: dict | None = None):
        if progress_callback:
            try:
                progress_callback(stage, data or {})
            except Exception:
                pass

    _notify("ast_started")

    # 1. Perform unified language detection
    detection = detector.detect(
        source_code=source_code,
        filename=filename,
        requested_language=language,
    )

    # 2. If language is not supported (e.g. JS/TS stub), expose clean error
    if not detection.supported:
        err_res = {
            "success": False,
            "error": "UnsupportedLanguage",
            "message": (
                f"Detected '{detection.display_name}' ({detection.source} detection), "
                "but AST analysis for this language is coming soon."
            ) if detection.language != "unknown" else "Unable to detect language with sufficient confidence.",
            "line": None,
            "detection": detection.to_dict(),
        }
        _notify("analysis_error", err_res)
        return err_res

    # 3. Retrieve language adapter
    target_language = registry.get(detection.language)
    if not target_language:
        err_res = {
            "success": False,
            "error": "UnsupportedLanguage",
            "message": f"Unsupported language '{detection.language}'.",
            "line": None,
            "detection": detection.to_dict(),
        }
        _notify("analysis_error", err_res)
        return err_res

    # 4. Parse source code
    try:
        syntax_tree = target_language.parser.parse(source_code)
    except SyntaxError as error:
        err_res = {
            "success": False,
            "error": "SyntaxError",
            "message": f"{getattr(error, 'msg', str(error))} at line {getattr(error, 'lineno', 1)}",
            "line": getattr(error, "lineno", 1),
            "detection": detection.to_dict(),
        }
        _notify("analysis_error", err_res)
        return err_res
    except Exception as error:
        traceback.print_exc()
        err_res = {
            "success": False,
            "error": type(error).__name__,
            "message": f"Unexpected error parsing {target_language.display_name} code.",
            "line": None,
            "detection": detection.to_dict(),
        }
        _notify("analysis_error", err_res)
        return err_res

    # 5. Run analysis engine
    try:
        res = target_language.analyzer.analyze(
            tree=syntax_tree,
            source_code=source_code,
            progress_callback=progress_callback,
        )
        res["detection"] = detection.to_dict()
        return res
    except Exception as error:
        traceback.print_exc()
        err_res = {
            "success": False,
            "error": type(error).__name__,
            "message": f"Unexpected error analyzing {target_language.display_name} code.",
            "line": None,
            "detection": detection.to_dict(),
        }
        _notify("analysis_error", err_res)
        return err_res
