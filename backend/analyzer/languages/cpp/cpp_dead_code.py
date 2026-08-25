"""
C++ Tree-sitter Dead Code Analyzer implementation.
Does NOT require main(). Analyzes C++ source structurally.
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
from ..c.c_dead_code import CDeadCodeAnalyzer


class CPPDeadCodeAnalyzer(CDeadCodeAnalyzer):
    """Dead code analyzer for C++ Tree-sitter CSTs."""

    def get_capability(self) -> DeadCodeCapability:
        return DeadCodeCapability(
            supported=True,
            categories=[
                DeadCodeCategory.UNREACHABLE_STATEMENT.value,
                DeadCodeCategory.UNREACHABLE_BRANCH.value,
                DeadCodeCategory.UNUSED_LOCAL.value,
            ],
            reason="C++ analyzer inspects unreachable statements after return/break/continue/throw and static dead branches without requiring main().",
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
            reason=f"Found {len(findings)} dead code findings in C++ source.",
        )

    def _check_unreachable_statements_in_block(self, block_node: Any, findings: List[DeadCodeFinding]):
        terminator_seen = False
        terminator_node_type = None

        terminating_types = {
            "return_statement",
            "break_statement",
            "continue_statement",
            "throw_expression",
            "throw_statement",
        }

        # C++ type/class declarations that should NOT be flagged as unreachable runtime statements
        type_declaration_types = {
            "class_specifier",
            "struct_specifier",
            "enum_specifier",
            "type_definition",
            "alias_declaration",
            "template_declaration",
            "using_declaration",
            "namespace_definition",
        }

        for child in block_node.children:
            if not child.is_named or child.type.startswith("comment") or child.type in type_declaration_types or child.type in ("{", "}"):
                continue

            if terminator_seen:
                start_line = child.start_point[0] + 1
                end_line = child.end_point[0] + 1
                term_name = terminator_node_type.replace("_statement", "").replace("_expression", "")
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
