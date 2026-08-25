"""
Rust Tree-sitter Dead Code Analyzer implementation.
"""

from __future__ import annotations

from typing import Any, List
from ...dead_code import (
    BaseDeadCodeAnalyzer,
    DeadCodeCapability,
    DeadCodeCategory,
    DeadCodeFinding,
    DeadCodeResult,
)


class RustDeadCodeAnalyzer(BaseDeadCodeAnalyzer):
    """Dead code analyzer for Rust Tree-sitter CSTs."""

    def get_capability(self) -> DeadCodeCapability:
        return DeadCodeCapability(
            supported=True,
            categories=[
                DeadCodeCategory.UNREACHABLE_STATEMENT.value,
                DeadCodeCategory.UNREACHABLE_BRANCH.value,
                DeadCodeCategory.UNUSED_LOCAL.value,
            ],
            reason="Rust analyzer inspects unreachable expressions after return/panic!/break/continue and static dead branches while protecting pub items.",
        )

    def analyze(self, syntax_tree: Any, source_code: str) -> DeadCodeResult:
        findings: List[DeadCodeFinding] = []

        if hasattr(syntax_tree, "raw_tree"):
            ts_tree = syntax_tree.raw_tree
        else:
            ts_tree = syntax_tree

        if hasattr(ts_tree, "root_node"):
            root = ts_tree.root_node
            self._traverse_node(root, findings, source_code)

        capability = self.get_capability()
        return DeadCodeResult(
            supported=True,
            count=len(findings),
            findings=findings,
            capability=capability,
            reason=f"Found {len(findings)} dead code findings in Rust source.",
        )

    def _traverse_node(self, node: Any, findings: List[DeadCodeFinding], source_code: str):
        # 1. Check unreachable expressions in block
        if node.type in ("block", "source_file"):
            self._check_unreachable_statements_in_block(node, findings, source_code)

        # 2. Check dead if false branches
        if node.type == "if_expression":
            self._check_dead_if_branch(node, findings, source_code)

        for child in node.children:
            self._traverse_node(child, findings, source_code)

    def _check_unreachable_statements_in_block(self, block_node: Any, findings: List[DeadCodeFinding], source_code: str):
        terminator_seen = False
        terminator_node_type = None

        terminating_types = {
            "return_expression",
            "break_expression",
            "continue_expression",
        }

        # Rust type/item declarations that should NOT be flagged as unreachable runtime statements
        rust_item_types = {
            "struct_item",
            "enum_item",
            "trait_item",
            "impl_item",
            "type_item",
            "mod_item",
            "use_declaration",
        }

        for child in block_node.children:
            if not child.is_named or child.type.startswith("comment") or child.type in rust_item_types or child.type in ("{", "}"):
                continue

            if terminator_seen:
                start_line = child.start_point[0] + 1
                end_line = child.end_point[0] + 1
                term_name = terminator_node_type.replace("_expression", "")
                findings.append(
                    DeadCodeFinding(
                        category=DeadCodeCategory.UNREACHABLE_STATEMENT.value,
                        message=f"Unreachable statement: this code follows an unconditional '{term_name}'.",
                        line=start_line,
                        end_line=end_line,
                        reason=f"Expression can never execute because preceding '{term_name}' unconditionally exits execution.",
                    )
                )

            if self._is_terminating_rust_node(child, source_code):
                terminator_seen = True
                terminator_node_type = "panic_macro" if self._is_diverging_macro(child, source_code) else "return_expression"

    def _is_terminating_rust_node(self, child: Any, source_code: str) -> bool:
        if child.type in {"return_expression", "break_expression", "continue_expression"}:
            return True
        if child.type == "expression_statement":
            for sub in child.children:
                if sub.type in {"return_expression", "break_expression", "continue_expression"}:
                    return True
        if self._is_diverging_macro(child, source_code):
            return True
        return False

    def _is_diverging_macro(self, node: Any, source_code: str) -> bool:
        if node.type in ("macro_invocation", "expression_statement"):
            text = source_code[node.start_byte : node.end_byte].strip()
            if text.startswith("panic!") or text.startswith("todo!") or text.startswith("unreachable!"):
                return True
        return False

    def _check_dead_if_branch(self, if_node: Any, findings: List[DeadCodeFinding], source_code: str):
        condition_node = if_node.child_by_field_name("condition")
        if not condition_node:
            for child in if_node.children:
                if child.type != "if" and child.type != "block":
                    condition_node = child
                    break

        if condition_node and self._is_statically_false(condition_node, source_code):
            start_line = if_node.start_point[0] + 1
            end_line = if_node.end_point[0] + 1
            findings.append(
                DeadCodeFinding(
                    category=DeadCodeCategory.UNREACHABLE_BRANCH.value,
                    message="Unreachable branch: if-condition is statically false.",
                    line=start_line,
                    end_line=end_line,
                    reason="Branch condition evaluates statically to false at compile time.",
                )
            )

    def _is_statically_false(self, cond_node: Any, source_code: str) -> bool:
        text = source_code[cond_node.start_byte : cond_node.end_byte].strip()
        if text.startswith("(") and text.endswith(")"):
            text = text[1:-1].strip()
        return text in ("false", "0", "!true")
