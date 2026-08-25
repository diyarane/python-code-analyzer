"""
Parse Python source into a JSON AST plus dashboard metrics and explanations.

Uses only the standard library `ast` module. This module is intentionally
straightforward so it can be explained in a viva or interview.
"""

from __future__ import annotations

import ast
import traceback

from .complexity import analyze_complexity
from .utils import count_ast_nodes, safe_unparse

MAX_VISUAL_NODES = 500
LARGE_TREE_DEPTH_LIMIT = 3


def analyze_code(source_code: str) -> dict:
    """
    Main entry for POST /analyze.

    Returns a dict suitable for jsonify(), with keys:
    success, ast (if success), metrics, explanations, warnings, node_count
    or success=False with error, message, line on failure.
    """
    try:
        tree = ast.parse(source_code)
    except SyntaxError as error:
        return {
            "success": False,
            "error": "SyntaxError",
            "message": f"{error.msg} at line {error.lineno}",
            "line": error.lineno,
        }
    except Exception as error:
        # Never leak raw tracebacks to the client; log server-side.
        traceback.print_exc()
        return {
            "success": False,
            "error": type(error).__name__,
            "message": "Unexpected error while parsing code.",
            "line": None,
        }

    node_count = count_ast_nodes(tree)
    depth_limit = LARGE_TREE_DEPTH_LIMIT if node_count > MAX_VISUAL_NODES else None

    metrics = analyze_complexity(tree)
    ast_json = ast_to_json(tree, depth_limit=depth_limit)
    explanations = build_explanations(metrics)

    return {
        "success": True,
        "ast": ast_json,
        "metrics": metrics,
        "explanations": explanations,
        "warnings": build_warnings(node_count, depth_limit),
        "node_count": node_count,
    }


def build_warnings(node_count: int, depth_limit: int | None) -> list[str]:
    if depth_limit is None:
        return []
    return [
        (
            f"AST contains {node_count} nodes. Visualization is limited "
            f"to depth {depth_limit} to keep the UI responsive."
        )
    ]


def build_explanations(metrics: dict) -> dict:
    """AI-style copy derived from computed metrics (no external LLM)."""
    time_c = metrics["time_complexity"]
    space_c = metrics["space_complexity"]
    score = metrics["optimization_score"]
    dead = metrics["dead_code_count"]

    time_text = (
        f"Estimated time complexity is {time_c}, based on loop nesting and "
        "a simple check for exponential recursion patterns (like naive Fibonacci)."
    )
    space_text = (
        f"Estimated space complexity is {space_c}, accounting for allocations "
        "in lists/dicts/sets and recursion stack depth in a coarse way."
    )
    opt_text = (
        f"Optimization score is {score}/100. Penalties apply for nested loops "
        "beyond depth 1, suspected inefficient recursion, and deep `if` nesting."
    )
    summary = (
        f"Found {dead} dead-code signals (unused function definitions plus "
        "statements after `return`, `raise`, or `exit`). Explore the AST tree to see "
        "where loops and branches concentrate complexity."
    )

    return {
        "time": time_text,
        "space": space_text,
        "optimization": opt_text,
        "summary": summary,
    }


def ast_to_json(tree: ast.AST, depth_limit: int | None = None) -> dict:
    """Convert Python AST into a frontend-friendly tree."""
    return serialize_node(
        tree,
        depth=0,
        depth_limit=depth_limit,
        function_stack=[],
        loop_depth=0,
        condition_depth=0,
    )


def complexity_weight_from(complexity: dict) -> int:
    """Map node complexity to 1=light, 2=medium, 3=heavy for D3 styling."""
    color = complexity.get("color", "green")
    if color == "red":
        return 3
    if color == "yellow":
        return 2
    return 1


def serialize_node(
    node: ast.AST,
    depth: int,
    depth_limit: int | None,
    function_stack: list[str],
    loop_depth: int,
    condition_depth: int,
) -> dict:
    """Serialize one AST node and recursively serialize its children."""
    node_type = node.__class__.__name__
    metadata = extract_metadata(node)
    label = build_label(node_type, metadata)

    next_function_stack = list(function_stack)
    next_loop_depth = loop_depth
    next_condition_depth = condition_depth

    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        next_function_stack.append(node.name)
    if isinstance(node, (ast.For, ast.While)):
        next_loop_depth += 1
    if isinstance(node, ast.If):
        next_condition_depth += 1

    complexity = classify_complexity(
        node,
        function_stack=function_stack,
        loop_depth=next_loop_depth,
        condition_depth=next_condition_depth,
    )
    weight = complexity_weight_from(complexity)

    data: dict = {
        "type": node_type,
        "label": label,
        "line": getattr(node, "lineno", None),
        "metadata": metadata,
        "complexity": complexity,
        "complexity_weight": weight,
        "children": [],
    }

    if depth_limit is not None and depth >= depth_limit:
        data["children"].append(
            {
                "type": "Collapsed",
                "label": "Depth limited",
                "line": None,
                "metadata": {"reason": "Large AST"},
                "complexity": {
                    "level": "simple",
                    "color": "green",
                    "reason": "Hidden to keep rendering fast.",
                },
                "complexity_weight": 1,
                "children": [],
            }
        )
        return data

    for child in ast.iter_child_nodes(node):
        data["children"].append(
            serialize_node(
                child,
                depth=depth + 1,
                depth_limit=depth_limit,
                function_stack=next_function_stack,
                loop_depth=next_loop_depth,
                condition_depth=next_condition_depth,
            )
        )

    return data


def extract_metadata(node: ast.AST) -> dict:
    """Pick beginner-friendly details for important AST node types."""
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        return {
            "name": node.name,
            "args": [arg.arg for arg in node.args.args],
        }
    if isinstance(node, ast.ClassDef):
        return {"name": node.name}
    if isinstance(node, ast.For):
        return {
            "loop_type": "for",
            "target": safe_unparse(node.target),
            "iter": safe_unparse(node.iter),
        }
    if isinstance(node, ast.While):
        return {
            "loop_type": "while",
            "condition": safe_unparse(node.test),
        }
    if isinstance(node, ast.If):
        return {"condition": safe_unparse(node.test)}
    if isinstance(node, ast.Assign):
        return {
            "targets": [safe_unparse(target) for target in node.targets],
            "value": safe_unparse(node.value),
        }
    if isinstance(node, ast.AnnAssign):
        return {
            "target": safe_unparse(node.target),
            "value": safe_unparse(node.value) if node.value else None,
        }
    if isinstance(node, ast.Call):
        return {"function": safe_unparse(node.func)}
    if isinstance(node, ast.Return):
        return {"value": safe_unparse(node.value) if node.value else None}
    if isinstance(node, ast.Import):
        return {"names": [alias.name for alias in node.names]}
    if isinstance(node, ast.ImportFrom):
        return {
            "module": node.module,
            "names": [alias.name for alias in node.names],
        }
    if isinstance(node, ast.ListComp):
        return {"expression": safe_unparse(node)}
    if isinstance(node, ast.Name):
        return {"name": node.id}
    if isinstance(node, ast.Constant):
        return {"value": repr(node.value)}
    return {}


def build_label(node_type: str, metadata: dict) -> str:
    """Create compact node labels for the D3 tree."""
    if "name" in metadata:
        return f"{node_type}: {metadata['name']}"
    if node_type in {"For", "While"}:
        return f"{node_type}: {metadata.get('loop_type', '').title()}"
    if node_type == "If":
        return f"If: {metadata.get('condition', '')}"
    if node_type == "Assign":
        return f"Assign: {', '.join(metadata.get('targets', []))}"
    if node_type == "Call":
        return f"Call: {metadata.get('function', '')}"
    if node_type == "Return":
        return "Return"
    if node_type in {"Import", "ImportFrom"}:
        return f"{node_type}: {', '.join(metadata.get('names', []))}"
    return node_type


def classify_complexity(
    node: ast.AST,
    function_stack: list[str],
    loop_depth: int,
    condition_depth: int,
) -> dict:
    """Assign a simple complexity class for visualization tooltips."""
    if isinstance(node, (ast.For, ast.While)):
        if loop_depth >= 2:
            return {
                "level": "expensive",
                "color": "red",
                "reason": "Nested loop increases polynomial time complexity.",
            }
        return {
            "level": "moderate",
            "color": "yellow",
            "reason": "Loop usually contributes O(n) work.",
        }

    if isinstance(node, ast.If) and condition_depth > 3:
        return {
            "level": "moderate",
            "color": "yellow",
            "reason": "Deeply nested condition can reduce readability.",
        }

    if isinstance(node, ast.Call) and function_stack:
        call_name = safe_unparse(node.func)
        if call_name == function_stack[-1]:
            return {
                "level": "expensive",
                "color": "red",
                "reason": "Recursive call can add stack usage and extra work.",
            }

    if isinstance(node, (ast.Assign, ast.Return, ast.Name, ast.Constant)):
        return {
            "level": "simple",
            "color": "green",
            "reason": "Simple operation with low direct complexity impact.",
        }

    return {
        "level": "simple",
        "color": "green",
        "reason": "Structural AST node with low direct complexity impact.",
    }
