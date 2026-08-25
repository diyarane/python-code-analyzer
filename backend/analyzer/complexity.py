import ast

from .utils import big_o_from_loop_depth
from .dead_code.models import (
    DeadCodeCapability,
    DeadCodeCategory,
    DeadCodeFinding,
    DeadCodeResult,
)


class ComplexityAnalyzer(ast.NodeVisitor):
    """Walk the AST once to collect metrics for the dashboard."""

    def __init__(self):
        self.max_loop_depth = 0
        self.current_loop_depth = 0
        self.max_condition_depth = 0
        self.current_condition_depth = 0
        self.defined_functions = set()
        self.function_lines = {}
        self.called_functions = set()
        self.recursive_functions = set()
        self.inefficient_recursive_functions = set()
        self.data_structure_count = 0
        self.unreachable_count = 0
        self.dead_code_findings: list[DeadCodeFinding] = []
        self.function_stack = []

    def visit(self, node):
        for child in ast.iter_child_nodes(node):
            setattr(child, "_parent", node)
        super().visit(node)

    def visit_Module(self, node):
        self._count_unreachable_in_body(node.body)
        self.generic_visit(node)

    def visit_FunctionDef(self, node):
        self.defined_functions.add(node.name)
        self.function_lines[node.name] = getattr(node, "lineno", 1)
        self.function_stack.append(node.name)
        self._count_unreachable_in_body(node.body)
        self.generic_visit(node)
        self.function_stack.pop()

    def visit_AsyncFunctionDef(self, node):
        self.visit_FunctionDef(node)

    def visit_For(self, node):
        self._enter_loop(node)

    def visit_While(self, node):
        self._enter_loop(node)

    def _enter_loop(self, node):
        self.current_loop_depth += 1
        self.max_loop_depth = max(self.max_loop_depth, self.current_loop_depth)
        self._count_unreachable_in_body(node.body)
        self.generic_visit(node)
        self.current_loop_depth -= 1

    def visit_If(self, node):
        self.current_condition_depth += 1
        self.max_condition_depth = max(
            self.max_condition_depth,
            self.current_condition_depth,
        )
        self._count_unreachable_in_body(node.body)
        self._count_unreachable_in_body(node.orelse)
        self.generic_visit(node)
        self.current_condition_depth -= 1

    def visit_List(self, node):
        self.data_structure_count += 1
        self.generic_visit(node)

    def visit_Dict(self, node):
        self.data_structure_count += 1
        self.generic_visit(node)

    def visit_Set(self, node):
        self.data_structure_count += 1
        self.generic_visit(node)

    def visit_ListComp(self, node):
        self.data_structure_count += 1
        self.generic_visit(node)

    def visit_DictComp(self, node):
        self.data_structure_count += 1
        self.generic_visit(node)

    def visit_SetComp(self, node):
        self.data_structure_count += 1
        self.generic_visit(node)

    def visit_Call(self, node):
        name = self._call_name(node)
        if name:
            self.called_functions.add(name)
            if self.function_stack and name == self.function_stack[-1]:
                self.recursive_functions.add(name)
                if self._looks_like_fibonacci_call(node):
                    self.inefficient_recursive_functions.add(name)
        self.generic_visit(node)

    def _call_name(self, node):
        if isinstance(node.func, ast.Name):
            return node.func.id
        if isinstance(node.func, ast.Attribute):
            return node.func.attr
        return None

    def _looks_like_fibonacci_call(self, node):
        """Heuristic: f(n-1) + f(n-2) style recursion is often exponential."""
        if not self.function_stack:
            return False

        parent = getattr(node, "_parent", None)
        if not isinstance(parent, ast.BinOp):
            return False

        recursive_calls = [
            child
            for child in ast.walk(parent)
            if isinstance(child, ast.Call)
            and isinstance(child.func, ast.Name)
            and child.func.id == self.function_stack[-1]
        ]
        return len(recursive_calls) >= 2

    def _count_unreachable_in_body(self, statements):
        found_terminator = False
        for statement in statements:
            if found_terminator:
                self.unreachable_count += 1
                self.dead_code_findings.append(
                    DeadCodeFinding(
                        category=DeadCodeCategory.UNREACHABLE_STATEMENT.value,
                        message="Statement is unreachable following unconditional return or exit.",
                        line=getattr(statement, "lineno", 1),
                        end_line=getattr(statement, "end_lineno", getattr(statement, "lineno", 1)),
                        reason="Statement will never execute because the previous statement unconditionally returns or exits.",
                    )
                )
            if isinstance(statement, (ast.Return, ast.Raise)) or self._is_exit_call(statement):
                found_terminator = True

    def _is_exit_call(self, statement):
        if not isinstance(statement, ast.Expr) or not isinstance(statement.value, ast.Call):
            return False
        func = statement.value.func
        if isinstance(func, ast.Name):
            return func.id in {"exit", "quit"}
        if isinstance(func, ast.Attribute) and isinstance(func.value, ast.Name):
            return (func.value.id, func.attr) in {("sys", "exit"), ("os", "_exit")}
        return False

    def metrics(self):
        inefficient_recursion = bool(self.inefficient_recursive_functions)
        dead_functions = self.defined_functions - self.called_functions

        for fn in sorted(dead_functions):
            fn_line = self.function_lines.get(fn, 1)
            self.dead_code_findings.append(
                DeadCodeFinding(
                    category=DeadCodeCategory.UNUSED_LOCAL.value,
                    message=f"Function '{fn}' is defined but never called within this module.",
                    line=fn_line,
                    symbol=fn,
                    reason=f"Function '{fn}' is defined but not referenced.",
                )
            )

        dead_code_count = len(self.dead_code_findings)

        dead_code_res = DeadCodeResult(
            supported=True,
            count=dead_code_count,
            findings=self.dead_code_findings,
            capability=DeadCodeCapability(
                supported=True,
                categories=[
                    DeadCodeCategory.UNREACHABLE_STATEMENT.value,
                    DeadCodeCategory.UNUSED_LOCAL.value,
                ],
                reason="Python AST analyzer inspects unreachable statements and unreferenced internal functions.",
            ),
            reason="Python dead-code detection completed.",
        )

        score = 100
        if self.max_loop_depth > 1:
            score -= (self.max_loop_depth - 1) * 20
        if inefficient_recursion:
            score -= 15
        if self.max_condition_depth > 3:
            score -= 10

        # Time: exponential recursion dominates naive loop estimate; linear recursion adds O(n).
        if inefficient_recursion:
            time_complexity = "O(2^n)"
        elif self.recursive_functions:
            if self.max_loop_depth >= 1:
                time_complexity = big_o_from_loop_depth(self.max_loop_depth + 1)
            else:
                time_complexity = "O(n)"
        else:
            time_complexity = big_o_from_loop_depth(self.max_loop_depth)

        if inefficient_recursion:
            space_complexity = "O(n)"
        elif self.recursive_functions or self.data_structure_count:
            space_complexity = "O(n)"
        else:
            space_complexity = "O(1)"

        return {
            "time_complexity": time_complexity,
            "space_complexity": space_complexity,
            "dead_code_count": dead_code_count,
            "dead_code_result": dead_code_res,
            "optimization_score": max(0, min(100, score)),
            "max_loop_depth": self.max_loop_depth,
            "max_condition_depth": self.max_condition_depth,
            "has_inefficient_recursion": inefficient_recursion,
        }


def attach_parent_links(tree):
    """Store parent references for simple recursion-pattern heuristics."""
    for parent in ast.walk(tree):
        for child in ast.iter_child_nodes(parent):
            child._parent = parent


def analyze_complexity(tree):
    attach_parent_links(tree)
    analyzer = ComplexityAnalyzer()
    analyzer.visit(tree)
    return analyzer.metrics()
