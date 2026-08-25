"""
Language-aware AI Explanation Generator for CodeAnalyzer AI.
Generates technical explanations tailored to Python, JavaScript, JSX, TypeScript, and TSX.
"""

from __future__ import annotations

from typing import Any, Dict


def generate_language_aware_explanations(
    language_id: str,
    metrics: Dict[str, Any],
    ast_tree: Dict[str, Any] | None = None,
) -> Dict[str, str]:
    """Generate summary, time, space, and optimization explanations for a language."""
    time_c = metrics.get("time_complexity", "O(1)")
    space_c = metrics.get("space_complexity", "O(1)")
    score = metrics.get("optimization_score", 100)
    dead_code = metrics.get("dead_code_count")
    status_map = metrics.get("metric_status", {})

    clean_lang = language_id.lower().strip()

    if "python" in clean_lang:
        return _build_python_explanations(time_c, space_c, score, dead_code)
    if "javascript" in clean_lang:
        return _build_javascript_explanations(time_c, space_c, score, "jsx" in clean_lang)
    if "typescript" in clean_lang:
        return _build_typescript_explanations(time_c, space_c, score, "tsx" in clean_lang)

    return _build_generic_explanations(time_c, space_c, score)


def _build_python_explanations(
    time_c: str, space_c: str, score: int, dead_code: int | None
) -> Dict[str, str]:
    time_text = (
        f"Estimated time complexity is {time_c}, based on loop nesting depth and "
        "recursion checking in Python AST control flow."
    )
    space_text = (
        f"Estimated space complexity is {space_c}, accounting for list/dict allocations "
        "and stack depth in Python execution."
    )
    opt_text = (
        f"Optimization score is {score}/100. Penalties apply for nested loops beyond depth 1 "
        "and deeply nested conditional branches."
    )
    dead_text = (
        f"Found {dead_code or 0} dead-code signals (unused function definitions and "
        "unreachable statements after `return`/`raise`)."
        if dead_code is not None
        else "Dead code reachability analysis completed."
    )
    summary = f"{dead_text} Explore the AST tree to see where loops and branches concentrate complexity."

    return {
        "summary": summary,
        "time": time_text,
        "space": space_text,
        "optimization": opt_text,
    }


def _build_javascript_explanations(
    time_c: str, space_c: str, score: int, is_jsx: bool
) -> Dict[str, str]:
    lang_title = "JavaScript/JSX" if is_jsx else "JavaScript"

    summary = (
        f"Parsed {lang_title} code using Tree-sitter. Analyzed arrow functions, "
        "loops, array methods, and component rendering structures. Dead-code analysis is "
        "unsupported for JavaScript."
    )
    time_text = (
        f"Estimated time complexity is {time_c}, derived from statement iteration and "
        "loop nesting."
    )
    space_text = (
        f"Estimated space complexity is {space_c}, reflecting array/object allocations and "
        "closure stack usage."
    )
    opt_text = (
        f"Optimization score is {score}/100. Consider flattening nested loops, adopting "
        "higher-order array methods (`map`/`filter`), and keeping component renders lightweight."
    )

    return {
        "summary": summary,
        "time": time_text,
        "space": space_text,
        "optimization": opt_text,
    }


def _build_typescript_explanations(
    time_c: str, space_c: str, score: int, is_tsx: bool
) -> Dict[str, str]:
    lang_title = "TypeScript/TSX" if is_tsx else "TypeScript"

    summary = (
        f"Parsed {lang_title} code using Tree-sitter. Analyzed interface declarations, "
        "type aliases, function signatures, and TS constructs. Dead-code analysis is "
        "unsupported for TypeScript."
    )
    time_text = (
        f"Estimated time complexity is {time_c}, based on loop statement depth and "
        "control flow branches."
    )
    space_text = (
        f"Estimated space complexity is {space_c}, reflecting object allocations and "
        "type-checked data structures."
    )
    opt_text = (
        f"Optimization score is {score}/100. Leverage strict TypeScript interfaces, avoid "
        "excessive loop nesting, and minimize redundant re-renders."
    )

    return {
        "summary": summary,
        "time": time_text,
        "space": space_text,
        "optimization": opt_text,
    }


def _build_generic_explanations(time_c: str, space_c: str, score: int) -> Dict[str, str]:
    return {
        "summary": "Parsed code structure using language parser adapter. Analyzed AST control flow.",
        "time": f"Estimated time complexity is {time_c}.",
        "space": f"Estimated space complexity is {space_c}.",
        "optimization": f"Optimization score is {score}/100.",
    }
