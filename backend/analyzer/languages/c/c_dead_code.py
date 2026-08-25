"""
C Tree-sitter Dead Code Analyzer implementation.
Does NOT require main(). Analyzes C source structurally.
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


class CDeadCodeAnalyzer(BaseDeadCodeAnalyzer):
    """Dead code analyzer for C Tree-sitter CSTs."""

    def get_capability(self) -> DeadCodeCapability:
        return DeadCodeCapability(
            supported=True,
            categories=[
                DeadCodeCategory.UNREACHABLE_STATEMENT.value,
                DeadCodeCategory.UNREACHABLE_BRANCH.value,
                DeadCodeCategory.UNUSED_LOCAL.value,
            ],
            reason="C analyzer inspects unreachable statements after return/break/continue and static dead branches without requiring main().",
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
            reason=f"Found {len(findings)} dead code findings in C source.",
        )

    def _traverse_node(self, node: Any, findings: List[DeadCodeFinding], source_code: str):
        # 1. Check unreachable statements in compound statements (blocks / function bodies)
        if node.type in ("compound_statement", "translation_unit"):
            self._check_unreachable_statements_in_block(node, findings)

        # 2. Check dead branch: if (0) { ... } or while (0) { ... }
        if node.type == "if_statement":
            self._check_dead_if_branch(node, findings, source_code)
        elif node.type == "while_statement":
            self._check_dead_while_branch(node, findings, source_code)

        for child in node.children:
            self._traverse_node(child, findings, source_code)

    def _check_unreachable_statements_in_block(self, block_node: Any, findings: List[DeadCodeFinding]):
        terminator_seen = False
        terminator_node_type = None

        terminating_types = {
            "return_statement",
            "break_statement",
            "continue_statement",
        }

        for child in block_node.children:
            if not child.is_named or child.type.startswith("comment") or child.type in ("{", "}"):
                continue

            if terminator_seen:
                start_line = child.start_point[0] + 1
                end_line = child.end_point[0] + 1
                term_name = terminator_node_type.replace("_statement", "")
                findings.append(
                    DeadCodeFinding(
                        category=DeadCodeCategory.UNREACHABLE_STATEMENT.value,
                        message=f"Unreachable statement: this statement follows an unconditional '{term_name}'.",
                        line=start_line,
                        end_line=end_line,
                        reason=f"Statement can never execute because preceding '{term_name}' unconditionally exits execution.",
                    )
                )

            if child.type in terminating_types:
                terminator_seen = True
                terminator_node_type = child.type

    def _check_dead_if_branch(self, if_node: Any, findings: List[DeadCodeFinding], source_code: str):
        condition_node = if_node.child_by_field_name("condition")
        if not condition_node:
            for child in if_node.children:
                if child.type == "parenthesized_expression":
                    condition_node = child
                    break

        if condition_node and self._is_statically_false(condition_node, source_code):
            start_line = if_node.start_point[0] + 1
            end_line = if_node.end_point[0] + 1
            findings.append(
                DeadCodeFinding(
                    category=DeadCodeCategory.UNREACHABLE_BRANCH.value,
                    message="Unreachable branch: condition is statically false.",
                    line=start_line,
                    end_line=end_line,
                    reason="Branch condition evaluates statically to 0/false at compile time.",
                )
            )

    def _check_dead_while_branch(self, while_node: Any, findings: List[DeadCodeFinding], source_code: str):
        condition_node = while_node.child_by_field_name("condition")
        if not condition_node:
            for child in while_node.children:
                if child.type == "parenthesized_expression":
                    condition_node = child
                    break

        if condition_node and self._is_statically_false(condition_node, source_code):
            start_line = while_node.start_point[0] + 1
            end_line = while_node.end_point[0] + 1
            findings.append(
                DeadCodeFinding(
                    category=DeadCodeCategory.UNREACHABLE_BRANCH.value,
                    message="Unreachable loop: while-condition is statically false.",
                    line=start_line,
                    end_line=end_line,
                    reason="Loop condition evaluates statically to 0/false at compile time, so body will never execute.",
                )
            )

    def _is_statically_false(self, cond_node: Any, source_code: str) -> bool:
        text = source_code[cond_node.start_byte : cond_node.end_byte].strip()
        if text.startswith("(") and text.endswith(")"):
            text = text[1:-1].strip()
        return text in ("0", "false", "NULL", "nullptr", "!1", "!true")
