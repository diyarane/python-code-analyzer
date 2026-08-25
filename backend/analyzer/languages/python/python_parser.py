"""Python parser implementation using standard library `ast` module."""

from __future__ import annotations

import ast
from ...base import BaseParser, NormalizedSyntaxTree


class PythonParser(BaseParser):
    """Parses Python source code using standard library `ast.parse`."""

    def parse(self, source_code: str) -> NormalizedSyntaxTree:
        """
        Parse source code into a Python AST.
        Raises SyntaxError on syntax failure.
        """
        tree = ast.parse(source_code)
        return NormalizedSyntaxTree(raw_tree=tree, source_code=source_code, language_id="python")
