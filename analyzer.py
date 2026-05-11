import ast
import sys

COMMON_DUNDER_METHODS = {
    "__init__", "__str__", "__repr__", "__eq__", "__ne__", "__lt__", "__le__",
    "__gt__", "__ge__", "__hash__", "__bool__", "__len__", "__iter__",
    "__next__", "__enter__", "__exit__", "__call__", "__getitem__",
    "__setitem__", "__delitem__", "__contains__", "__add__", "__sub__",
    "__mul__", "__truediv__", "__floordiv__", "__mod__", "__pow__",
}


class DeadCodeAnalyzer(ast.NodeVisitor):
    """Analyzes unused imports, variables, functions, classes, and parameters."""
    def __init__(self):
        self.defined_functions = set()
        self.called_functions = set()
        self.defined_variables = {}  # {name: line_number}
        self.used_variables = set()
        self.function_parameters = set()  # Kept for backward compatibility
        self.imports = {}  # {binding_name: line_number}
        self.import_aliases = {}  # {alias: original_name}
        self.defined_classes = {}  # {name: line_number}
        self.used_classes = set()
        self.method_parameters = {}  # {"Class.method(param)": line_number}
        self.used_method_parameters = set()
        self.class_stack = []
        self.function_depth = 0
        self.parameter_context_stack = []
        
    def visit_ClassDef(self, node):
        self.defined_classes[node.name] = node.lineno
        self.class_stack.append(node.name)
        self.generic_visit(node)
        self.class_stack.pop()
        
    def visit_FunctionDef(self, node):
        self._visit_function(node)
    
    def visit_AsyncFunctionDef(self, node):
        self._visit_function(node)
    
    def _visit_function(self, node):
        self.defined_functions.add(node.name)
        params = self._get_parameter_names(node.args)
        self.function_parameters.update(params)

        is_method = bool(self.class_stack) and self.function_depth == 0
        parameter_context = {}

        if is_method and node.name not in COMMON_DUNDER_METHODS:
            method_name = f"{self.class_stack[-1]}.{node.name}"
            for param in params:
                parameter_context[param] = f"{method_name}({param})"
                if param not in {"self", "cls"}:
                    self.method_parameters[parameter_context[param]] = node.lineno
        else:
            # Non-method parameters still shadow outer method parameters.
            for param in params:
                parameter_context[param] = None

        self.parameter_context_stack.append(parameter_context)
        self.function_depth += 1
        self.generic_visit(node)
        self.function_depth -= 1
        self.parameter_context_stack.pop()

    def _get_parameter_names(self, args):
        """Collect all parameter names from a function or method."""
        params = []
        all_args = args.posonlyargs + args.args + args.kwonlyargs
        params.extend(arg.arg for arg in all_args)
        if args.vararg:
            params.append(args.vararg.arg)
        if args.kwarg:
            params.append(args.kwarg.arg)
        return params
    
    def visit_Call(self, node):
        # Track function calls and simple method calls like object.method().
        if isinstance(node.func, ast.Name):
            self.called_functions.add(node.func.id)
            self.used_classes.add(node.func.id)
        elif isinstance(node.func, ast.Attribute):
            self.called_functions.add(node.func.attr)
            if isinstance(node.func.value, ast.Name):
                self.used_variables.add(node.func.value.id)
        self.generic_visit(node)
    
    def visit_Assign(self, node):
        # Track variable assignments, including tuple/list unpacking.
        for target in node.targets:
            self._track_assignment_target(target, node.lineno)
        self.generic_visit(node)

    def visit_AnnAssign(self, node):
        self._track_assignment_target(node.target, node.lineno)
        self.generic_visit(node)

    def visit_AugAssign(self, node):
        self._track_assignment_target(node.target, node.lineno)
        if isinstance(node.target, ast.Name):
            self.used_variables.add(node.target.id)
        self.generic_visit(node)

    def visit_For(self, node):
        self._track_assignment_target(node.target, node.lineno)
        self.generic_visit(node)

    def _track_assignment_target(self, target, line_number):
        """Record assigned variable names without treating attributes as variables."""
        if isinstance(target, ast.Name):
            self.defined_variables[target.id] = line_number
        elif isinstance(target, (ast.Tuple, ast.List)):
            for item in target.elts:
                self._track_assignment_target(item, line_number)
    
    def visit_Name(self, node):
        # Track variable usage (not assignments).
        if isinstance(node.ctx, ast.Load):
            self.used_variables.add(node.id)
            self.used_classes.add(node.id)
            self._mark_parameter_used(node.id)
        self.generic_visit(node)

    def _mark_parameter_used(self, name):
        """Mark method parameters as used, respecting shadowing by inner functions."""
        for context in reversed(self.parameter_context_stack):
            if name in context:
                qualified_name = context[name]
                if qualified_name:
                    self.used_method_parameters.add(qualified_name)
                return
    
    def visit_Import(self, node):
        # For "import os.path", Python binds the top-level name "os".
        for alias in node.names:
            name = alias.asname if alias.asname else alias.name.split(".")[0]
            self.imports[name] = node.lineno
            if alias.asname:
                self.import_aliases[alias.asname] = alias.name
        self.generic_visit(node)
    
    def visit_ImportFrom(self, node):
        for alias in node.names:
            name = alias.asname if alias.asname else alias.name
            self.imports[name] = node.lineno
            if alias.asname:
                self.import_aliases[alias.asname] = alias.name
        self.generic_visit(node)
    
    def get_dead_functions(self):
        """Returns functions/methods that are defined but never called."""
        return self.defined_functions - self.called_functions - COMMON_DUNDER_METHODS
    
    def get_unused_variables(self):
        """Returns variables that are assigned but never used."""
        unused = {}
        for var, line in self.defined_variables.items():
            if var not in self.used_variables and var not in self.function_parameters:
                unused[var] = line
        return unused
    
    def get_unused_imports(self):
        """Returns imports that are never referenced."""
        unused = {}
        for imp_name, line in self.imports.items():
            original = self.import_aliases.get(imp_name, imp_name)
            if imp_name not in self.used_variables and original not in self.used_variables:
                unused[imp_name] = line
        return unused

    def get_unused_classes(self):
        """Returns classes that are defined but never referenced."""
        unused = {}
        for class_name, line in self.defined_classes.items():
            if class_name not in self.used_classes and class_name not in self.used_variables:
                unused[class_name] = line
        return unused

    def get_unused_method_parameters(self):
        """Returns method parameters that are never used inside their method."""
        unused = {}
        for param_name, line in self.method_parameters.items():
            if param_name not in self.used_method_parameters:
                unused[param_name] = line
        return unused


class FunctionAnalyzer(ast.NodeVisitor):
    def __init__(self):
        self.functions = {}

    def visit_FunctionDef(self, node):
        analyzer = SingleFunctionAnalyzer(node.name)
        analyzer.visit(node)

        self.functions[node.name] = {
            "loops": analyzer.loop_depth,
            "recursive": analyzer.is_recursive,
            "time_complexity": analyzer.estimate_time_complexity(),
            "space_complexity": analyzer.estimate_space_complexity(),
            "data_structures": analyzer.data_structures,
            "max_recursion_depth": analyzer.max_recursion_depth,
            # Heuristic flag for when hash/set suggestions make sense
            "hash_optimization_candidate": analyzer.is_hash_optimization_candidate()
        }

        self.generic_visit(node)


class SingleFunctionAnalyzer(ast.NodeVisitor):
    def __init__(self, function_name):
        self.function_name = function_name
        self.current_loop_depth = 0
        self.loop_depth = 0
        self.is_recursive = False
        self.data_structures = set()  # Track lists, dicts, sets
        self.max_recursion_depth = 0
        self.current_recursion_depth = 0
        # Heuristics for hash/set optimization
        self.loop_vars_stack = []  # Stack of loop variable names for nested loops
        self.has_membership_checks = False
        self.has_equality_comparisons_in_loops = False
        self.has_dependent_loop_expressions = False

    # ---- LOOP DETECTION ----
    def visit_For(self, node):
        # Track loop variable names (e.g., for i in ...)
        loop_vars = self._extract_loop_vars(node.target)
        self.loop_vars_stack.append(loop_vars)
        self.current_loop_depth += 1
        self.loop_depth = max(self.loop_depth, self.current_loop_depth)
        self.generic_visit(node)
        self.current_loop_depth -= 1
        self.loop_vars_stack.pop()

    def visit_While(self, node):
        # While-loops don't introduce new loop variables, but still affect depth
        self.current_loop_depth += 1
        self.loop_depth = max(self.loop_depth, self.current_loop_depth)
        self.generic_visit(node)
        self.current_loop_depth -= 1

    def _extract_loop_vars(self, target):
        """Return a set of variable names introduced by the loop header."""
        vars_found = set()
        if isinstance(target, ast.Name):
            vars_found.add(target.id)
        elif isinstance(target, (ast.Tuple, ast.List)):
            for elt in target.elts:
                if isinstance(elt, ast.Name):
                    vars_found.add(elt.id)
        return vars_found

    # ---- RECURSION DETECTION ----
    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            if node.func.id == self.function_name:
                self.is_recursive = True
                # Estimate recursion depth by counting nested calls
                self.current_recursion_depth += 1
                self.max_recursion_depth = max(self.max_recursion_depth, 
                                               self.current_recursion_depth)
                # Continue visiting to find nested recursive calls
                self.generic_visit(node)
                self.current_recursion_depth -= 1
                return
        self.generic_visit(node)

    # ---- HEURISTICS FOR HASH/SET OPTIMIZATION ----
    def _in_nested_loops(self):
        """Return True if we are inside at least two nested loops."""
        return self.loop_depth >= 2 and len(self.loop_vars_stack) >= 2

    def _all_loop_vars(self):
        """Flattened set of all loop variable names currently in scope."""
        all_vars = set()
        for names in self.loop_vars_stack:
            all_vars.update(names)
        return all_vars

    def _collect_names(self, node):
        """Collect all variable names used inside an expression node."""
        names = set()

        class _NameCollector(ast.NodeVisitor):
            def __init__(self):
                self.names = set()

            def visit_Name(self, n):
                if isinstance(n.ctx, (ast.Load, ast.Store, ast.Del)):
                    self.names.add(n.id)

        collector = _NameCollector()
        collector.visit(node)
        return collector.names

    def visit_Compare(self, node):
        # Detect membership checks (x in collection) inside nested loops
        if self._in_nested_loops():
            for op in node.ops:
                if isinstance(op, (ast.In, ast.NotIn)):
                    # Membership test inside nested loops is a good candidate
                    self.has_membership_checks = True
                elif isinstance(op, (ast.Eq, ast.NotEq)):
                    # Equality comparisons in nested loops are often "search-like"
                    self.has_equality_comparisons_in_loops = True
        self.generic_visit(node)

    def visit_BinOp(self, node):
        # Detect expressions that use multiple loop variables together
        if self._in_nested_loops():
            all_loop_vars = self._all_loop_vars()
            expr_vars = self._collect_names(node) & all_loop_vars
            # If an expression combines two different loop variables,
            # we treat it as a dependent nested loop (e.g., matrix operations).
            if len(expr_vars) >= 2:
                self.has_dependent_loop_expressions = True
        self.generic_visit(node)

    def visit_Subscript(self, node):
        # Detect indexing expressions, e.g., a[i][j] or matrix[i][j]
        if self._in_nested_loops():
            all_loop_vars = self._all_loop_vars()
            # For different Python versions, the index can be in 'slice' or 'index'
            index_node = getattr(node, "slice", None)
            if index_node is None:
                index_node = getattr(node, "index", None)
            if index_node is not None:
                expr_vars = self._collect_names(index_node) & all_loop_vars
                if len(expr_vars) >= 2:
                    # Both loop variables used in the same index expression:
                    # likely matrix-like or dependent nested loops.
                    self.has_dependent_loop_expressions = True
        self.generic_visit(node)

    # ---- DATA STRUCTURE DETECTION ----
    def visit_List(self, node):
        self.data_structures.add('list')
        self.generic_visit(node)
    
    def visit_Dict(self, node):
        self.data_structures.add('dict')
        self.generic_visit(node)
    
    def visit_Set(self, node):
        self.data_structures.add('set')
        self.generic_visit(node)
    
    def visit_ListComp(self, node):
        self.data_structures.add('list')
        self.generic_visit(node)
    
    def visit_DictComp(self, node):
        self.data_structures.add('dict')
        self.generic_visit(node)
    
    def visit_SetComp(self, node):
        self.data_structures.add('set')
        self.generic_visit(node)

    # ---- TIME COMPLEXITY ESTIMATION ----
    def estimate_time_complexity(self):
        if self.is_recursive and self.loop_depth > 0:
            return "O(n log n) (heuristic)"

        if self.is_recursive:
            return "O(n) or worse (recursive)"

        if self.loop_depth == 0:
            return "O(1)"

        if self.loop_depth == 1:
            return "O(n)"

        return f"O(n^{self.loop_depth})"

    # ---- SPACE COMPLEXITY ESTIMATION ----
    def estimate_space_complexity(self):
        """Estimate space complexity based on data structures and recursion."""
        has_data_structures = len(self.data_structures) > 0
        
        # Recursive functions typically use O(n) space for call stack
        if self.is_recursive:
            if has_data_structures and self.loop_depth > 0:
                return "O(n) (recursion + data structures)"
            return "O(n) (recursion stack)"
        
        # Data structures created in loops
        if has_data_structures:
            if self.loop_depth == 0:
                return "O(1)"
            elif self.loop_depth == 1:
                return "O(n) (linear data structure)"
            else:
                return f"O(n^{self.loop_depth}) (nested data structures)"
        
        # No recursion, no significant data structures
        return "O(1)"

    def is_hash_optimization_candidate(self):
        """
        Heuristic: suggest hash/set optimization only when
        - we have nested loops, AND
        - we see membership or equality checks inside them, AND
        - the nested loops do NOT clearly use both loop variables together
          in the same expression (which would look like matrix operations
          or other dependent loops).
        """
        if not self._in_nested_loops():
            return False

        if self.has_dependent_loop_expressions:
            # Likely numerical or matrix-style computations; do NOT suggest hashing.
            return False

        # Membership checks (x in collection) or equality comparisons
        # in nested loops usually indicate repeated search-like operations.
        return self.has_membership_checks or self.has_equality_comparisons_in_loops


class CodeIssueAnalyzer(ast.NodeVisitor):
    """Detects unreachable code and redundant constant conditions."""
    def __init__(self):
        self.unreachable_code = []
        self.redundant_conditionals = []

    def visit_Module(self, node):
        self._visit_statement_body(node.body)

    def visit_FunctionDef(self, node):
        self._visit_statement_body(node.body)

    def visit_AsyncFunctionDef(self, node):
        self._visit_statement_body(node.body)

    def visit_ClassDef(self, node):
        self._visit_statement_body(node.body)

    def visit_If(self, node):
        self._check_constant_condition(node, "if")
        self.visit(node.test)
        self._visit_statement_body(node.body)
        self._visit_statement_body(node.orelse)

    def visit_While(self, node):
        self._check_constant_condition(node, "while")
        self.visit(node.test)
        self._visit_statement_body(node.body)
        self._visit_statement_body(node.orelse)

    def visit_For(self, node):
        self.visit(node.iter)
        self._visit_statement_body(node.body)
        self._visit_statement_body(node.orelse)

    def visit_With(self, node):
        self._visit_statement_body(node.body)

    def visit_Try(self, node):
        self._visit_statement_body(node.body)
        for handler in node.handlers:
            self._visit_statement_body(handler.body)
        self._visit_statement_body(node.orelse)
        self._visit_statement_body(node.finalbody)

    def _visit_statement_body(self, statements):
        """Visit a list of statements and flag statements after terminators."""
        self._check_unreachable_code(statements)
        for statement in statements:
            self.visit(statement)

    def _check_unreachable_code(self, statements):
        found_terminator = None
        for statement in statements:
            if found_terminator is not None:
                self.unreachable_code.append(
                    {
                        "line": statement.lineno,
                        "reason": f"appears after {found_terminator}",
                    }
                )
            if self._is_terminating_statement(statement):
                found_terminator = self._terminator_name(statement)

    def _is_terminating_statement(self, statement):
        return (
            isinstance(statement, (ast.Return, ast.Raise))
            or self._is_exit_call(statement)
        )

    def _terminator_name(self, statement):
        if isinstance(statement, ast.Return):
            return "return"
        if isinstance(statement, ast.Raise):
            return "raise"
        return "exit"

    def _is_exit_call(self, statement):
        """Detect exit(), quit(), sys.exit(), and os._exit() calls."""
        if not isinstance(statement, ast.Expr) or not isinstance(statement.value, ast.Call):
            return False

        func = statement.value.func
        if isinstance(func, ast.Name):
            return func.id in {"exit", "quit"}
        if isinstance(func, ast.Attribute):
            if func.attr == "exit" and isinstance(func.value, ast.Name):
                return func.value.id == "sys"
            if func.attr == "_exit" and isinstance(func.value, ast.Name):
                return func.value.id == "os"
        return False

    def _check_constant_condition(self, node, keyword):
        """Flag branches such as if True:, if False:, and while False:."""
        if isinstance(node.test, ast.Constant) and isinstance(node.test.value, bool):
            self.redundant_conditionals.append(
                {
                    "line": node.lineno,
                    "type": keyword,
                    "value": node.test.value,
                }
            )


def find_duplicate_code_blocks(source_code, block_size=5):
    """Find repeated blocks of 5+ identical consecutive non-empty lines."""
    lines = source_code.splitlines()
    seen_blocks = {}
    duplicates = []
    reported_pairs = set()

    if len(lines) < block_size:
        return duplicates

    for index in range(len(lines) - block_size + 1):
        block = tuple(line.strip() for line in lines[index:index + block_size])
        if any(not line for line in block):
            continue

        if block in seen_blocks:
            first_start = seen_blocks[block]
            pair = (first_start, index)
            if pair not in reported_pairs:
                duplicates.append(
                    {
                        "first_start": first_start + 1,
                        "first_end": first_start + block_size,
                        "duplicate_start": index + 1,
                        "duplicate_end": index + block_size,
                    }
                )
                reported_pairs.add(pair)
        else:
            seen_blocks[block] = index

    return duplicates


# ---- OPTIMIZATION SUGGESTIONS ----
def generate_suggestions(function_data, dead_code_data, issue_data=None):
    """Generate high-level optimization suggestions."""
    suggestions = []
    issue_data = issue_data or {}
    
    # Check for high complexity functions
    for func_name, data in function_data.items():
        if data['loops'] >= 3:
            suggestions.append(
                f"Function '{func_name}' has {data['loops']} nested loops. "
                "Consider: breaking into smaller functions, using hash tables "
                "for lookups, or pre-computing values."
            )
        
        if data['recursive'] and data['loops'] > 0:
            suggestions.append(
                f"Function '{func_name}' combines recursion with loops. "
                "Consider: iterative approach or memoization to reduce complexity."
            )
        
        if data['recursive'] and data['max_recursion_depth'] > 10:
            suggestions.append(
                f"Function '{func_name}' has deep recursion. "
                "Consider: iterative solution or tail recursion optimization."
            )

        # Check for O(n^2) or worse time complexity.
        # We only suggest hash/set optimization when our heuristics say that
        # the nested loops are being used in a "search-like" way (membership
        # or equality checks), and not for numeric/matrix-style computations.
        if (
            'O(n^' in data['time_complexity']
            and data.get('hash_optimization_candidate')
        ):
            suggestions.append(
                f"Function '{func_name}' has {data['time_complexity']} time complexity "
                "with nested search-like comparisons. "
                "Consider: using hash tables (dict/set) for O(1) membership tests "
                "instead of repeated scanning inside nested loops."
            )
    
    # Dead code suggestions
    dead_funcs = dead_code_data.get_dead_functions()
    if dead_funcs:
        suggestions.append(
            f"Unused functions detected: {', '.join(dead_funcs)}. "
            "Consider removing them to improve code maintainability."
        )
    
    unused_vars = dead_code_data.get_unused_variables()
    if unused_vars:
        var_list = ', '.join(list(unused_vars.keys())[:5])  # Limit to first 5
        suggestions.append(
            f"Unused variables detected: {var_list}. "
            "Consider removing them to reduce confusion."
        )
    
    unused_imports = dead_code_data.get_unused_imports()
    if unused_imports:
        imp_list = ', '.join(list(unused_imports.keys())[:5])  # Limit to first 5
        suggestions.append(
            f"Unused imports detected: {imp_list}. "
            "Consider removing them to reduce dependencies."
        )

    unused_classes = dead_code_data.get_unused_classes()
    if unused_classes:
        class_list = ', '.join(list(unused_classes.keys())[:5])
        suggestions.append(
            f"Unused classes detected: {class_list}. "
            "Consider removing them if they are not part of the public API."
        )

    unused_params = dead_code_data.get_unused_method_parameters()
    if unused_params:
        param_list = ', '.join(list(unused_params.keys())[:5])
        suggestions.append(
            f"Unused method parameters detected: {param_list}. "
            "Consider removing them if they are not required by an interface."
        )

    if issue_data.get("unreachable_code"):
        suggestions.append(
            "Unreachable code detected. Consider removing statements that appear "
            "after return, raise, or exit calls."
        )

    if issue_data.get("redundant_conditionals"):
        suggestions.append(
            "Redundant constant conditions detected. Consider simplifying branches "
            "such as if True, if False, or while False."
        )

    if issue_data.get("duplicate_blocks"):
        suggestions.append(
            "Duplicated code blocks detected. Consider extracting repeated logic "
            "into a small helper function."
        )
    
    return suggestions


# ---- REPORT GENERATION ----
def generate_report(function_data, dead_code_data, suggestions, issue_data=None):
    """Generate a structured text report."""
    issue_data = issue_data or {}
    report = []
    report.append("=" * 60)
    report.append("STATIC CODE ANALYSIS REPORT")
    report.append("=" * 60)
    report.append("")
    
    # Section 1: Function Complexity Analysis
    report.append("1. FUNCTION COMPLEXITY ANALYSIS")
    report.append("-" * 60)
    if function_data:
        for func, data in function_data.items():
            report.append(f"\nFunction: {func}")
            report.append(f"  Max Loop Depth      : {data['loops']}")
            report.append(f"  Recursive          : {data['recursive']}")
            if data['recursive']:
                report.append(f"  Max Recursion Depth: {data['max_recursion_depth']}")
            report.append(f"  Data Structures    : {', '.join(data['data_structures']) if data['data_structures'] else 'None'}")
            report.append(f"  Time Complexity    : {data['time_complexity']}")
            report.append(f"  Space Complexity   : {data['space_complexity']}")
    else:
        report.append("  No functions found.")
    report.append("")
    
    # Section 2: Dead Code Detection
    report.append("2. DEAD CODE DETECTION")
    report.append("-" * 60)
    
    dead_funcs = dead_code_data.get_dead_functions()
    if dead_funcs:
        report.append(f"\nUnused Functions ({len(dead_funcs)}):")
        for func in sorted(dead_funcs):
            report.append(f"  - {func}")
    else:
        report.append("\n  ✓ No unused functions detected.")
    
    unused_vars = dead_code_data.get_unused_variables()
    if unused_vars:
        report.append(f"\nUnused Variables ({len(unused_vars)}):")
        for var, line in sorted(unused_vars.items(), key=lambda x: x[1]):
            report.append(f"  - {var} (line {line})")
    else:
        report.append("\n  ✓ No unused variables detected.")
    
    unused_imports = dead_code_data.get_unused_imports()
    if unused_imports:
        report.append(f"\nUnused Imports ({len(unused_imports)}):")
        for imp, line in sorted(unused_imports.items(), key=lambda x: x[1]):
            report.append(f"  - {imp} (line {line})")
    else:
        report.append("\n  ✓ No unused imports detected.")

    unused_classes = dead_code_data.get_unused_classes()
    if unused_classes:
        report.append(f"\nUnused Classes ({len(unused_classes)}):")
        for class_name, line in sorted(unused_classes.items(), key=lambda x: x[1]):
            report.append(f"  - {class_name} (line {line})")
    else:
        report.append("\n  ✓ No unused classes detected.")

    unused_params = dead_code_data.get_unused_method_parameters()
    if unused_params:
        report.append(f"\nUnused Method Parameters ({len(unused_params)}):")
        for param, line in sorted(unused_params.items(), key=lambda x: x[1]):
            report.append(f"  - {param} (line {line})")
    else:
        report.append("\n  ✓ No unused method parameters detected.")

    unreachable_code = issue_data.get("unreachable_code", [])
    if unreachable_code:
        report.append(f"\nUnreachable Code ({len(unreachable_code)}):")
        for item in unreachable_code:
            report.append(f"  - line {item['line']} ({item['reason']})")
    else:
        report.append("\n  ✓ No unreachable code detected.")

    redundant_conditionals = issue_data.get("redundant_conditionals", [])
    if redundant_conditionals:
        report.append(f"\nRedundant Conditional Branches ({len(redundant_conditionals)}):")
        for item in redundant_conditionals:
            report.append(
                f"  - line {item['line']} ({item['type']} condition is {item['value']})"
            )
    else:
        report.append("\n  ✓ No redundant conditional branches detected.")

    duplicate_blocks = issue_data.get("duplicate_blocks", [])
    if duplicate_blocks:
        report.append(f"\nDuplicated Code Blocks ({len(duplicate_blocks)}):")
        for item in duplicate_blocks:
            report.append(
                f"  - lines {item['duplicate_start']}-{item['duplicate_end']} "
                f"duplicate lines {item['first_start']}-{item['first_end']}"
            )
    else:
        report.append("\n  ✓ No duplicated code blocks detected.")
    report.append("")
    
    # Section 3: Optimization Suggestions
    report.append("3. OPTIMIZATION SUGGESTIONS")
    report.append("-" * 60)
    if suggestions:
        for i, suggestion in enumerate(suggestions, 1):
            report.append(f"\n{i}. {suggestion}")
    else:
        report.append("\n  ✓ No major optimization opportunities detected.")
    report.append("")
    
    report.append("=" * 60)
    report.append("END OF REPORT")
    report.append("=" * 60)
    
    return "\n".join(report)


# ---- CORE ANALYSIS ENTRY POINTS ----
def analyze_source(source_code: str) -> str:
    """
    Analyze Python source code given as a string and return the
    plain-text report. This is used both by the CLI and the HTTP backend.
    """
    tree = ast.parse(source_code)

    # Analyze function complexity
    function_analyzer = FunctionAnalyzer()
    function_analyzer.visit(tree)
    
    # Analyze dead code
    dead_code_analyzer = DeadCodeAnalyzer()
    dead_code_analyzer.visit(tree)

    # Analyze unreachable code and constant conditional branches
    code_issue_analyzer = CodeIssueAnalyzer()
    code_issue_analyzer.visit(tree)

    issue_data = {
        "unreachable_code": code_issue_analyzer.unreachable_code,
        "redundant_conditionals": code_issue_analyzer.redundant_conditionals,
        "duplicate_blocks": find_duplicate_code_blocks(source_code),
    }
    
    # Generate suggestions
    suggestions = generate_suggestions(
        function_analyzer.functions,
        dead_code_analyzer,
        issue_data,
    )
    
    # Generate report text
    return generate_report(
        function_analyzer.functions,
        dead_code_analyzer,
        suggestions,
        issue_data,
    )


def analyze_file(filename: str) -> None:
    """Convenience wrapper to analyze a file on disk for CLI use."""
    with open(filename, "r") as file:
        source_code = file.read()
    report = analyze_source(source_code)
    print(report)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python analyzer.py <python_file>")
        sys.exit(1)
    else:
        try:
            analyze_file(sys.argv[1])
        except FileNotFoundError:
            print(f"Error: File '{sys.argv[1]}' not found.")
            sys.exit(1)
        except SyntaxError as e:
            print(f"Error: Syntax error in file: {e}")
            sys.exit(1)
        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)
