"""Python analysis engine implementation."""

from __future__ import annotations

import ast
import traceback
from typing import Any, Callable, Dict, Optional

from ...base import BaseAnalyzer, NormalizedSyntaxTree
from ...complexity import analyze_complexity
from ...normalized_metrics import build_metric_status_map
from ...utils import count_ast_nodes, safe_unparse

MAX_VISUAL_NODES = 500
LARGE_TREE_DEPTH_LIMIT = 3


class PythonAnalyzer(BaseAnalyzer):
    """Analyzes Python AST for complexity, dead code, AST tree JSON, and explanations."""

    def analyze(
        self,
        tree: NormalizedSyntaxTree,
        source_code: str,
        progress_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    ) -> Dict[str, Any]:
        def _notify(stage: str, data: Dict[str, Any] | None = None):
            if progress_callback:
                try:
                    progress_callback(stage, data or {})
                except Exception:
                    pass

        raw_ast = tree.raw_tree
        node_count = count_ast_nodes(raw_ast)
        depth_limit = LARGE_TREE_DEPTH_LIMIT if node_count > MAX_VISUAL_NODES else None
        _notify("ast_completed", {"node_count": node_count})

        metrics = analyze_complexity(raw_ast)
        metrics["metric_status"] = build_metric_status_map(
            time_complexity=metrics["time_complexity"],
            space_complexity=metrics["space_complexity"],
            dead_code_count=metrics["dead_code_count"],
            optimization_score=metrics["optimization_score"],
            dead_code_supported=True,
            language_display="Python",
        )
        _notify("complexity_completed", {
            "time_complexity": metrics["time_complexity"],
            "space_complexity": metrics["space_complexity"]
        })
        _notify("dead_code_completed", {"dead_code_count": metrics["dead_code_count"]})
        _notify("optimization_completed", {"optimization_score": metrics["optimization_score"]})

        _notify("ai_analysis_started")
        ast_json = ast_to_json(raw_ast, depth_limit=depth_limit)
        explanations = build_explanations(metrics)
        _notify("ai_analysis_completed")

        return {
            "success": True,
            "language": "python",
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
    """AI-style copy derived from computed metrics."""
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
    color = complexity.get("color", "green")
    if color == "red":
        return 3
    if color == "yellow":
        return 2
    return 1


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


def serialize_node(
    node: ast.AST,
    depth: int,
    depth_limit: int | None,
    function_stack: list[str],
    loop_depth: int,
    condition_depth: int,
) -> dict:
    """Serialize one Python AST node and recursively serialize its children."""
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
        "end_line": getattr(node, "end_lineno", None),
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
                "end_line": None,
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
