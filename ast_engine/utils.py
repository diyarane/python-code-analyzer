import ast


def safe_unparse(node):
    """Return readable source-like text for an AST node when possible."""
    try:
        return ast.unparse(node)
    except Exception:
        return node.__class__.__name__


def count_ast_nodes(tree):
    """Count AST nodes so the frontend can avoid rendering huge trees."""
    return sum(1 for _ in ast.walk(tree))


def big_o_from_loop_depth(loop_depth):
    if loop_depth <= 0:
        return "O(1)"
    if loop_depth == 1:
        return "O(n)"
    if loop_depth == 2:
        return "O(n²)"
    if loop_depth == 3:
        return "O(n³)"
    return f"O(n^{loop_depth})"

