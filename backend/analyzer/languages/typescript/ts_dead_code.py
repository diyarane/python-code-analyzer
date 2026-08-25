"""
TypeScript & TSX Tree-sitter Dead Code Analyzer implementation.
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
from ..javascript.js_dead_code import JSDeadCodeAnalyzer


class TSDeadCodeAnalyzer(JSDeadCodeAnalyzer):
    """Dead code analyzer for TypeScript and TSX Tree-sitter CSTs."""

    def get_capability(self) -> DeadCodeCapability:
        return DeadCodeCapability(
            supported=True,
            categories=[
                DeadCodeCategory.UNREACHABLE_STATEMENT.value,
                DeadCodeCategory.UNREACHABLE_BRANCH.value,
                DeadCodeCategory.UNUSED_LOCAL.value,
            ],
            reason="TypeScript analyzer inspects unreachable statements after return/throw/break/continue and static dead branches while preserving type-only declarations.",
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
            reason=f"Found {len(findings)} dead code findings in TypeScript source.",
        )

    def _check_unreachable_statements_in_block(self, block_node: Any, findings: List[DeadCodeFinding]):
        terminator_seen = False
        terminator_node_type = None

        terminating_types = {
            "return_statement",
            "throw_statement",
            "break_statement",
            "continue_statement",
        }

        # TypeScript type-only declarations that should NOT be flagged as unreachable runtime statements
        type_only_types = {
            "interface_declaration",
            "type_alias_declaration",
            "enum_declaration",
            "ambient_declaration",
        }

        for child in block_node.children:
            if not child.is_named or child.type.startswith("comment") or child.type in type_only_types:
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
