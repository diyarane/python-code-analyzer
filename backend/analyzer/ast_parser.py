"""
Main entry point for multi-language AST analysis.

Delegates analysis to registered language adapters (LanguageRegistry).
Maintains 100% backward compatibility for Python source analysis.
"""

from __future__ import annotations

import traceback
from typing import Any, Callable, Dict, Optional
from .registry import registry


def analyze_code(
    source_code: str,
    progress_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    language: Optional[str] = None,
    filename: Optional[str] = None,
) -> dict:
    """
    Main entry for POST /analyze and WebSocket execution.

    Detects or looks up the appropriate language adapter and runs parsing & analysis.
    Returns a dict suitable for jsonify().
    """
    def _notify(stage: str, data: dict | None = None):
        if progress_callback:
            try:
                progress_callback(stage, data or {})
            except Exception:
                pass

    _notify("ast_started")

    target_language = registry.detect_language(
        source_code=source_code,
        filename=filename,
        requested_language=language,
    )

    try:
        syntax_tree = target_language.parser.parse(source_code)
    except SyntaxError as error:
        err_res = {
            "success": False,
            "error": "SyntaxError",
            "message": f"{getattr(error, 'msg', str(error))} at line {getattr(error, 'lineno', 1)}",
            "line": getattr(error, "lineno", 1),
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
        }
        _notify("analysis_error", err_res)
        return err_res

    try:
        return target_language.analyzer.analyze(
            tree=syntax_tree,
            source_code=source_code,
            progress_callback=progress_callback,
        )
    except Exception as error:
        traceback.print_exc()
        err_res = {
            "success": False,
            "error": type(error).__name__,
            "message": f"Unexpected error analyzing {target_language.display_name} code.",
            "line": None,
        }
        _notify("analysis_error", err_res)
        return err_res
