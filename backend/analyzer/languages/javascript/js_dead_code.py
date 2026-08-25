"""
JavaScript & JSX Tree-sitter Dead Code Analyzer implementation.
"""

from __future__ import annotations

from typing import Any, List, Set
from ...dead_code import (
    BaseDeadCodeAnalyzer,
    DeadCodeCapability,
    DeadCodeCategory,
    DeadCodeFinding,
    DeadCodeResult,
)


class JSDeadCodeAnalyzer(BaseDeadCodeAnalyzer):
    """Dead code analyzer for JavaScript and JSX Tree-sitter CSTs."""

    def get_capability(self) -> DeadCodeCapability:
        return DeadCodeCapability(
            supported=True,
            categories=[
                DeadCodeCategory.UNREACHABLE_STATEMENT.value,
                DeadCodeCategory.UNREACHABLE_BRANCH.value,
                DeadCodeCategory.UNUSED_LOCAL.value,
            ],
            reason="JavaScript analyzer inspects unreachable statements after return/throw/break/continue and static dead branches.",
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
            reason=f"Found {len(findings)} dead code findings in JavaScript source.",
        )

    def _traverse_node(self, node: Any, findings: List[DeadCodeFinding], source_code: str):
        # 1. Check unreachable statements in statement blocks or function bodies
        if node.type in ("statement_block", "program"):
            self._check_unreachable_statements_in_block(node, findings)

        # 2. Check statically provable dead branch: if (false) { ... } or if (0) { ... }
        if node.type == "if_statement":
            self._check_dead_if_branch(node, findings, source_code)

        for child in node.children:
            self._traverse_node(child, findings, source_code)

    def _check_unreachable_statements_in_block(self, block_node: Any, findings: List[DeadCodeFinding]):
        terminator_seen = False
        terminator_node_type = None

        terminating_types = {
            "return_statement",
            "throw_statement",
            "break_statement",
            "continue_statement",
        }

        for child in block_node.children:
            # Skip non-named syntax (braces, semicolons, comments)
            if not child.is_named or child.type.startswith("comment"):
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
        # Tree-sitter if_statement: children include condition inside parenthesized_expression or condition field
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
                    message="Unreachable branch: if-condition is statically false.",
                    line=start_line,
                    end_line=end_line,
                    reason="Branch condition evaluates statically to false at compile time.",
                )
            )

    def _is_statically_false(self, cond_node: Any, source_code: str) -> bool:
        text = source_code[cond_node.start_byte : cond_node.end_byte].strip()
        # Unwrap parentheses: (false) -> false
        if text.startswith("(") and text.endswith(")"):
            text = text[1:-1].strip()
        return text in ("false", "0", "!true", "null", "undefined")
