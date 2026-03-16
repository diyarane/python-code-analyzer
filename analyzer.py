import ast
import sys

class DeadCodeAnalyzer(ast.NodeVisitor):
    """Analyzes dead code: unused functions, variables, and imports."""
    def __init__(self):
        self.defined_functions = set()
        self.called_functions = set()
        self.defined_variables = {}  # {name: line_number}
        self.used_variables = set()
        self.function_parameters = set()  # Track function parameters
        self.imports = {}  # {name: line_number}
        self.import_aliases = {}  # {alias: original_name}
        
    def visit_FunctionDef(self, node):
        self.defined_functions.add(node.name)
        # Track function parameters
        for arg in node.args.args:
            self.function_parameters.add(arg.arg)
        self.generic_visit(node)
    
    def visit_AsyncFunctionDef(self, node):
        self.defined_functions.add(node.name)
        # Track function parameters
        for arg in node.args.args:
            self.function_parameters.add(arg.arg)
        self.generic_visit(node)
    
    def visit_Call(self, node):
        # Track function calls
        if isinstance(node.func, ast.Name):
            self.called_functions.add(node.func.id)
        elif isinstance(node.func, ast.Attribute):
            # Handle method calls like obj.method()
            if isinstance(node.func.value, ast.Name):
                self.used_variables.add(node.func.value.id)
        self.generic_visit(node)
    
    def visit_Assign(self, node):
        # Track variable assignments
        for target in node.targets:
            if isinstance(target, ast.Name):
                self.defined_variables[target.id] = node.lineno
        self.generic_visit(node)
    
    def visit_Name(self, node):
        # Track variable usage (not assignments)
        if isinstance(node.ctx, ast.Load):
            self.used_variables.add(node.id)
        self.generic_visit(node)
    
    def visit_Import(self, node):
        # Track imports
        for alias in node.names:
            name = alias.asname if alias.asname else alias.name
            self.imports[name] = node.lineno
            if alias.asname:
                self.import_aliases[alias.asname] = alias.name
        self.generic_visit(node)
    
    def visit_ImportFrom(self, node):
        # Track from imports
        for alias in node.names:
            name = alias.asname if alias.asname else alias.name
            self.imports[name] = node.lineno
            if alias.asname:
                self.import_aliases[alias.asname] = alias.name
        self.generic_visit(node)
    
    def get_dead_functions(self):
        """Returns functions that are defined but never called."""
        # Exclude main entry point and special methods
        special = {'__main__', '__init__', '__str__', '__repr__', '__eq__'}
        return self.defined_functions - self.called_functions - special
    
    def get_unused_variables(self):
        """Returns variables that are assigned but never used."""
        unused = {}
        for var, line in self.defined_variables.items():
            # Exclude variables that are used or are function parameters
            if var not in self.used_variables and var not in self.function_parameters:
                unused[var] = line
        return unused
    
    def get_unused_imports(self):
        """Returns imports that are never referenced."""
        unused = {}
        for imp_name, line in self.imports.items():
            # Check if import is used as a name or attribute
            if imp_name not in self.used_variables:
                # Check if it's used via attribute access (e.g., os.path)
                original = self.import_aliases.get(imp_name, imp_name)
                if original not in self.used_variables:
                    unused[imp_name] = line
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


# ---- OPTIMIZATION SUGGESTIONS ----
def generate_suggestions(function_data, dead_code_data):
    """Generate high-level optimization suggestions."""
    suggestions = []
    
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
    
    return suggestions


# ---- REPORT GENERATION ----
def generate_report(function_data, dead_code_data, suggestions):
    """Generate a structured text report."""
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
    
    # Generate suggestions
    suggestions = generate_suggestions(function_analyzer.functions, dead_code_analyzer)
    
    # Generate report text
    return generate_report(function_analyzer.functions, dead_code_analyzer, suggestions)


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
