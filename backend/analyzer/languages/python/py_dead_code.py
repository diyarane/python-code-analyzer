"""
Python Dead Code Analyzer implementation.
"""

from __future__ import annotations

import ast
from typing import Any, List
from ...dead_code import (
    BaseDeadCodeAnalyzer,
    DeadCodeCapability,
    DeadCodeCategory,
    DeadCodeFinding,
    DeadCodeResult,
)


class PythonDeadCodeVisitor(ast.NodeVisitor):
    """AST visitor inspecting Python AST for unreachable statements and dead branches."""

    def __init__(self):
        self.findings: List[DeadCodeFinding] = []
        self.defined_functions = set()
        self.function_lines = {}
        self.called_functions = set()

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self.defined_functions.add(node.name)
        self.function_lines[node.name] = getattr(node, "lineno", 1)
        if hasattr(node, "body") and isinstance(node.body, list):
            self._check_unreachable_in_body(node.body)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self.visit_FunctionDef(node)

    def visit_For(self, node: ast.For):
        if hasattr(node, "body") and isinstance(node.body, list):
            self._check_unreachable_in_body(node.body)
        self.generic_visit(node)

    def visit_AsyncFor(self, node: ast.AsyncFor):
        self.visit_For(node)

    def visit_While(self, node: ast.While):
        if hasattr(node, "body") and isinstance(node.body, list):
            self._check_unreachable_in_body(node.body)
        self.generic_visit(node)

    def visit_If(self, node: ast.If):
        # Check statically provable unreachable branch: if False: or if 0:
        if self._is_statically_false(node.test):
            line = getattr(node, "lineno", 1)
            end_line = getattr(node, "end_lineno", line)
            self.findings.append(
                DeadCodeFinding(
                    category=DeadCodeCategory.UNREACHABLE_BRANCH.value,
                    message="Unreachable branch: condition is statically false.",
                    line=line,
                    end_line=end_line,
                    reason="Branch condition evaluates statically to False at compile time.",
                )
            )

        if hasattr(node, "body") and isinstance(node.body, list):
            self._check_unreachable_in_body(node.body)
        if hasattr(node, "orelse") and isinstance(node.orelse, list):
            self._check_unreachable_in_body(node.orelse)

        self.generic_visit(node)

    def visit_Call(self, node: ast.Call):
        if isinstance(node.func, ast.Name):
            self.called_functions.add(node.func.id)
        self.generic_visit(node)

    def _is_statically_false(self, expr: ast.AST) -> bool:
        if isinstance(expr, ast.Constant) and (expr.value is False or expr.value == 0):
            return True
        if isinstance(expr, ast.NameConstant) and expr.value is False:
            return True
        if isinstance(expr, ast.Num) and expr.n == 0:
            return True
        return False

    def _check_unreachable_in_body(self, statements: List[ast.stmt]):
        found_terminator = False
        for statement in statements:
            if found_terminator:
                line = getattr(statement, "lineno", 1)
                end_line = getattr(statement, "end_lineno", line)
                self.findings.append(
                    DeadCodeFinding(
                        category=DeadCodeCategory.UNREACHABLE_STATEMENT.value,
                        message="Unreachable statement following unconditional exit or return.",
                        line=line,
                        end_line=end_line,
                        reason="This statement can never execute because the preceding statement unconditionally exits execution.",
                    )
                )
            if isinstance(statement, (ast.Return, ast.Raise, ast.Break, ast.Continue)) or self._is_exit_call(statement):
                found_terminator = True

    def _is_exit_call(self, statement: ast.stmt) -> bool:
        if not isinstance(statement, ast.Expr) or not isinstance(statement.value, ast.Call):
            return False
        func = statement.value.func
        if isinstance(func, ast.Name):
            return func.id in {"exit", "quit"}
        if isinstance(func, ast.Attribute) and isinstance(func.value, ast.Name):
            return (func.value.id, func.attr) in {("sys", "exit"), ("os", "_exit")}
        return False


class PythonDeadCodeAnalyzer(BaseDeadCodeAnalyzer):
    """Dead code analyzer for Python ASTs."""

    def get_capability(self) -> DeadCodeCapability:
        return DeadCodeCapability(
            supported=True,
            categories=[
                DeadCodeCategory.UNREACHABLE_STATEMENT.value,
                DeadCodeCategory.UNREACHABLE_BRANCH.value,
                DeadCodeCategory.UNUSED_LOCAL.value,
            ],
            reason="Python AST analyzer inspects unreachable statements after returns/exits, dead if-False branches, and unreferenced local functions.",
        )

    def analyze(self, syntax_tree: Any, source_code: str) -> DeadCodeResult:
        visitor = PythonDeadCodeVisitor()
        if hasattr(syntax_tree, "raw_tree"):
            raw_tree = syntax_tree.raw_tree
        else:
            raw_tree = syntax_tree

        if isinstance(raw_tree, ast.AST):
            visitor.visit(raw_tree)

        # Flag unused private/internal functions (names starting with _ or nested local helpers)
        dead_fns = visitor.defined_functions - visitor.called_functions
        for fn in sorted(dead_fns):
            if fn.startswith("_") and fn != "__init__":
                fn_line = visitor.function_lines.get(fn, 1)
                visitor.findings.append(
                    DeadCodeFinding(
                        category=DeadCodeCategory.UNUSED_LOCAL.value,
                        message=f"Internal function '{fn}' is defined but never called.",
                        line=fn_line,
                        symbol=fn,
                        reason=f"Internal function '{fn}' is defined but not referenced.",
                    )
                )

        capability = self.get_capability()
        return DeadCodeResult(
            supported=True,
            count=len(visitor.findings),
            findings=visitor.findings,
            capability=capability,
            reason=f"Found {len(visitor.findings)} dead code findings in Python source.",
        )
