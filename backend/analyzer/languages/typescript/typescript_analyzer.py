"""TypeScript & TSX analysis engine implementation."""

from __future__ import annotations

from typing import Any, Callable, Dict, Optional
from ...base import BaseAnalyzer, NormalizedSyntaxTree
from ...engine import engine
from ...explanation_builder import generate_language_aware_explanations


class TypeScriptAnalyzer(BaseAnalyzer):
    """Analyzes TypeScript / TSX Tree-sitter ASTs for complexity, AST JSON tree, and explanations."""

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

        ts_tree = tree.raw_tree
        root_node = ts_tree.root_node

        node_count = self._count_nodes(root_node)
        _notify("ast_completed", {"node_count": node_count})

        metrics = self._compute_metrics(root_node, tree.language_id)
        _notify("complexity_completed", {
            "time_complexity": metrics["time_complexity"],
            "space_complexity": metrics["space_complexity"]
        })
        _notify("dead_code_completed", {"dead_code_count": metrics["dead_code_count"]})
        _notify("optimization_completed", {"optimization_score": metrics["optimization_score"]})

        _notify("ai_analysis_started")
        ast_json = serialize_ts_node(root_node, source_code)
        explanations = generate_language_aware_explanations(tree.language_id, metrics, root_node)
        _notify("ai_analysis_completed")

        return {
            "success": True,
            "language": tree.language_id,
            "ast": ast_json,
            "metrics": metrics,
            "explanations": explanations,
            "warnings": [],
            "node_count": node_count,
        }

    def _count_nodes(self, node) -> int:
        count = 1
        for child in node.children:
            count += self._count_nodes(child)
        return count

    def _compute_metrics(self, root_node, lang_id: str) -> Dict[str, Any]:
        max_loop_depth = self._get_max_loop_depth(root_node, current_depth=0)
        max_cond_depth = self._get_max_cond_depth(root_node, current_depth=0)
        lang_title = "TypeScript/TSX" if "tsx" in lang_id else "TypeScript"

        return engine.compute_control_flow_metrics(
            max_loop_depth=max_loop_depth,
            max_condition_depth=max_cond_depth,
            dead_code_count=None,
            dead_code_supported=False,
            language_display=lang_title,
        )

    def _get_max_loop_depth(self, node, current_depth: int) -> int:
        loop_types = {
            "for_statement",
            "for_in_statement",
            "for_of_statement",
            "while_statement",
            "do_statement",
        }
        is_loop = node.type in loop_types
        next_depth = current_depth + 1 if is_loop else current_depth
        max_depth = next_depth

        for child in node.children:
            max_depth = max(max_depth, self._get_max_loop_depth(child, next_depth))
        return max_depth

    def _get_max_cond_depth(self, node, current_depth: int) -> int:
        is_cond = node.type in {"if_statement", "switch_statement"}
        next_depth = current_depth + 1 if is_cond else current_depth
        max_depth = next_depth

        for child in node.children:
            max_depth = max(max_depth, self._get_max_cond_depth(child, next_depth))
        return max_depth


def serialize_ts_node(node, source_code: str, depth: int = 0) -> dict:
    """Recursively convert Tree-sitter TS CST node into frontend AST node schema."""
    start_line = node.start_point[0] + 1
    end_line = node.end_point[0] + 1

    node_type = format_ts_node_type(node.type)
    label = build_ts_label(node, source_code)
    weight = 2 if "statement" in node.type or "declaration" in node.type else 1

    children = []
    for child in node.children:
        if child.is_named or child.type in ("arrow_function", "jsx_element", "jsx_self_closing_element"):
            children.append(serialize_ts_node(child, source_code, depth + 1))

    return {
        "type": node_type,
        "label": label,
        "line": start_line,
        "end_line": end_line,
        "metadata": {"type": node.type},
        "complexity": {
            "level": "moderate" if weight == 2 else "simple",
            "color": "yellow" if weight == 2 else "green",
            "reason": f"{node_type} construct",
        },
        "complexity_weight": weight,
        "children": children,
    }


def format_ts_node_type(raw_type: str) -> str:
    parts = raw_type.split("_")
    return "".join(p.capitalize() for p in parts)


def build_ts_label(node, source_code: str) -> str:
    formatted = format_ts_node_type(node.type)

    if node.type == "interface_declaration":
        name_node = node.child_by_field_name("name")
        if name_node:
            name_text = source_code[name_node.start_byte : name_node.end_byte]
            return f"Interface: {name_text}"
        return "Interface"

    if node.type == "type_alias_declaration":
        name_node = node.child_by_field_name("name")
        if name_node:
            name_text = source_code[name_node.start_byte : name_node.end_byte]
            return f"Type: {name_text}"
        return "TypeAlias"

    if node.type == "function_declaration":
        name_node = node.child_by_field_name("name")
        if name_node:
            name_text = source_code[name_node.start_byte : name_node.end_byte]
            return f"Function: {name_text}"
        return "Function"

    if node.type in ("lexical_declaration", "variable_declaration"):
        text = source_code[node.start_byte : node.end_byte].split("\n")[0]
        if len(text) > 24:
            text = text[:23] + "…"
        return f"Var: {text}"

    if node.type == "call_expression":
        func_node = node.child_by_field_name("function")
        if func_node:
            func_text = source_code[func_node.start_byte : func_node.end_byte]
            return f"Call: {func_text}"
        return "Call"

    if node.type == "arrow_function":
        return "ArrowFunction"

    if node.type == "if_statement":
        return "IfStatement"

    if node.type in ("for_statement", "for_in_statement", "for_of_statement", "while_statement"):
        return f"Loop: {formatted}"

    if node.type in ("jsx_element", "jsx_self_closing_element"):
        text = source_code[node.start_byte : node.end_byte].split("\n")[0]
        if len(text) > 24:
            text = text[:23] + "…"
        return f"TSX: {text}"

    return formatted
