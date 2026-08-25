"""Rust parser implementation using Tree-sitter."""

from __future__ import annotations

from tree_sitter_languages import get_parser
from ...base import BaseParser, NormalizedSyntaxTree


class RustParser(BaseParser):
    """Parses Rust source code into a Tree-sitter AST."""

    def __init__(self):
        self._parser = get_parser("rust")

    def parse(self, source_code: str) -> NormalizedSyntaxTree:
        if not source_code or not source_code.strip():
            raise ValueError("No code was provided.")

        code_bytes = source_code.encode("utf-8")
        tree = self._parser.parse(code_bytes)
        root = tree.root_node

        if root.has_error:
            error_node = self._find_first_error(root)
            line = (error_node.start_point[0] + 1) if error_node else 1
            raise SyntaxError(f"Rust syntax error at line {line}", ("code", line, 1, source_code))

        return NormalizedSyntaxTree(raw_tree=tree, source_code=source_code, language_id="rust")

    def _find_first_error(self, node):
        if node.type in ("ERROR", "MISSING") or node.is_missing:
            return node
        for child in node.children:
            if child.has_error:
                found = self._find_first_error(child)
                if found:
                    return found
        return node
