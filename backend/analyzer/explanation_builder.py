"""
Language-aware AI Explanation Generator for CodeAnalyzer AI.
Generates technical explanations tailored to Python, JavaScript, JSX, TypeScript, TSX, Java, C, C++, Go, and Rust.
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

    clean_lang = language_id.lower().strip()

    if "python" in clean_lang:
        return _build_python_explanations(time_c, space_c, score, dead_code)
    if "javascript" in clean_lang:
        return _build_javascript_explanations(time_c, space_c, score, "jsx" in clean_lang, dead_code)
    if "typescript" in clean_lang:
        return _build_typescript_explanations(time_c, space_c, score, "tsx" in clean_lang, dead_code)
    if clean_lang == "java":
        return _build_java_explanations(time_c, space_c, score, dead_code)
    if clean_lang == "c":
        return _build_c_explanations(time_c, space_c, score, dead_code)
    if clean_lang in ("cpp", "c++"):
        return _build_cpp_explanations(time_c, space_c, score, dead_code)
    if clean_lang == "go":
        return _build_go_explanations(time_c, space_c, score, dead_code)
    if clean_lang == "rust":
        return _build_rust_explanations(time_c, space_c, score, dead_code)

    return _build_generic_explanations(time_c, space_c, score, dead_code)


def _format_dead_code_summary(dead_code: int | None) -> str:
    if dead_code is None:
        return "Dead-code analysis status is unsupported for this language."
    if dead_code == 0:
        return "Dead-code analysis identified 0 unreachable statements or unused local definitions."
    return f"Dead-code analysis identified {dead_code} unreachable statement(s) or unused local definition(s)."


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
    time_c: str, space_c: str, score: int, is_jsx: bool, dead_code: int | None
) -> Dict[str, str]:
    lang_title = "JavaScript/JSX" if is_jsx else "JavaScript"
    dead_summary = _format_dead_code_summary(dead_code)

    summary = (
        f"Parsed {lang_title} code using Tree-sitter. Analyzed arrow functions, "
        f"loops, array methods, and component rendering structures. {dead_summary}"
    )
    time_text = f"Estimated time complexity is {time_c}, derived from statement iteration and loop nesting."
    space_text = f"Estimated space complexity is {space_c}, reflecting array/object allocations and closure stack usage."
    opt_text = f"Optimization score is {score}/100. Consider flattening nested loops and using array iteration methods (`map`/`filter`)."

    return {"summary": summary, "time": time_text, "space": space_text, "optimization": opt_text}


def _build_typescript_explanations(
    time_c: str, space_c: str, score: int, is_tsx: bool, dead_code: int | None
) -> Dict[str, str]:
    lang_title = "TypeScript/TSX" if is_tsx else "TypeScript"
    dead_summary = _format_dead_code_summary(dead_code)

    summary = (
        f"Parsed {lang_title} code using Tree-sitter. Analyzed interface declarations, "
        f"type aliases, function signatures, and TS constructs. {dead_summary}"
    )
    time_text = f"Estimated time complexity is {time_c}, based on loop statement depth and control flow branches."
    space_text = f"Estimated space complexity is {space_c}, reflecting object allocations and type-checked data structures."
    opt_text = f"Optimization score is {score}/100. Leverage strict TypeScript interfaces and minimize nested loops."

    return {"summary": summary, "time": time_text, "space": space_text, "optimization": opt_text}


def _build_java_explanations(time_c: str, space_c: str, score: int, dead_code: int | None) -> Dict[str, str]:
    dead_summary = _format_dead_code_summary(dead_code)
    summary = f"Parsed Java source code using Tree-sitter. Analyzed class declarations, methods, and loop control flow. {dead_summary}"
    time_text = f"Estimated time complexity is {time_c}, based on method loop nesting."
    space_text = f"Estimated space complexity is {space_c}, reflecting heap object instantiations and call stack depth."
    opt_text = f"Optimization score is {score}/100. Avoid deep loop nesting and optimize object creation inside loops."

    return {"summary": summary, "time": time_text, "space": space_text, "optimization": opt_text}


def _build_c_explanations(time_c: str, space_c: str, score: int, dead_code: int | None) -> Dict[str, str]:
    dead_summary = _format_dead_code_summary(dead_code)
    summary = f"Parsed C source code using Tree-sitter. Analyzed functions, structs, pointers, and iterative loops. {dead_summary}"
    time_text = f"Estimated time complexity is {time_c}, based on iterative loop statements."
    space_text = f"Estimated space complexity is {space_c}, reflecting stack frames and dynamic memory allocations."
    opt_text = f"Optimization score is {score}/100. Minimize nested loops and keep memory access contiguous."

    return {"summary": summary, "time": time_text, "space": space_text, "optimization": opt_text}


def _build_cpp_explanations(time_c: str, space_c: str, score: int, dead_code: int | None) -> Dict[str, str]:
    dead_summary = _format_dead_code_summary(dead_code)
    summary = f"Parsed C++ source code using Tree-sitter. Analyzed classes, templates, range-based loops, and functions. {dead_summary}"
    time_text = f"Estimated time complexity is {time_c}, based on statement loop depth."
    space_text = f"Estimated space complexity is {space_c}, reflecting STL container allocations and stack frames."
    opt_text = f"Optimization score is {score}/100. Prefer range-based loops and avoid unnecessary copy instantiations."

    return {"summary": summary, "time": time_text, "space": space_text, "optimization": opt_text}


def _build_go_explanations(time_c: str, space_c: str, score: int, dead_code: int | None) -> Dict[str, str]:
    dead_summary = _format_dead_code_summary(dead_code)
    summary = f"Parsed Go source code using Tree-sitter. Analyzed package declarations, functions, structs, and `for` loops. {dead_summary}"
    time_text = f"Estimated time complexity is {time_c}, based on Go `for` loop statement nesting."
    space_text = f"Estimated space complexity is {space_c}, reflecting slice/map allocations and goroutine stack usage."
    opt_text = f"Optimization score is {score}/100. Flatten nested `for` loops and keep slice allocations pre-sized."

    return {"summary": summary, "time": time_text, "space": space_text, "optimization": opt_text}


def _build_rust_explanations(time_c: str, space_c: str, score: int, dead_code: int | None) -> Dict[str, str]:
    dead_summary = _format_dead_code_summary(dead_code)
    summary = f"Parsed Rust source code using Tree-sitter. Analyzed functions (`fn`), structs, enums, `impl` blocks, and `match` expressions. {dead_summary}"
    time_text = f"Estimated time complexity is {time_c}, based on `for`/`while`/`loop` iteration depth."
    space_text = f"Estimated space complexity is {space_c}, reflecting stack bindings and Heap `Vec`/`String` allocations."
    opt_text = f"Optimization score is {score}/100. Leverage Rust zero-cost iterators and avoid deep loop nesting."

    return {"summary": summary, "time": time_text, "space": space_text, "optimization": opt_text}


def _build_generic_explanations(time_c: str, space_c: str, score: int, dead_code: int | None) -> Dict[str, str]:
    dead_summary = _format_dead_code_summary(dead_code)
    return {
        "summary": f"Parsed code structure using language parser adapter. {dead_summary}",
        "time": f"Estimated time complexity is {time_c}.",
        "space": f"Estimated space complexity is {space_c}.",
        "optimization": f"Optimization score is {score}/100.",
    }
