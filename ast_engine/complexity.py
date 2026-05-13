import ast

from .utils import big_o_from_loop_depth


class ComplexityAnalyzer(ast.NodeVisitor):
    """Small heuristic analyzer for dashboard metrics."""

    def __init__(self):
        self.current_loop_depth = 0
        self.max_loop_depth = 0
        self.current_condition_depth = 0
        self.max_condition_depth = 0
        self.data_structure_count = 0
        self.defined_functions = set()
        self.called_functions = set()
        self.function_stack = []
        self.recursive_functions = set()
        self.inefficient_recursive_functions = set()
        self.unreachable_count = 0

    def visit_Module(self, node):
        self._count_unreachable_in_body(node.body)
        self.generic_visit(node)

    def visit_FunctionDef(self, node):
        self.defined_functions.add(node.name)
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
            child for child in ast.walk(parent)
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
        dead_code_count = len(dead_functions) + self.unreachable_count

        score = 100
        if self.max_loop_depth > 1:
            score -= (self.max_loop_depth - 1) * 20
        if inefficient_recursion:
            score -= 15
        if self.max_condition_depth > 3:
            score -= 10

        if inefficient_recursion:
            space_complexity = "O(2^n)"
        elif self.recursive_functions or self.data_structure_count:
            space_complexity = "O(n)"
        else:
            space_complexity = "O(1)"

        return {
            "time_complexity": big_o_from_loop_depth(self.max_loop_depth),
            "space_complexity": space_complexity,
            "dead_code_count": dead_code_count,
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

