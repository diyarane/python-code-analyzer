"""C language definition module."""

from __future__ import annotations

import re
from typing import List
from ...base import BaseAnalyzer, BaseLanguage, BaseParser
from .c_analyzer import CAnalyzer
from .c_parser import CParser


class CLanguage(BaseLanguage):
    """C language definition and adapter."""

    def __init__(self):
        self._parser = CParser()
        self._analyzer = CAnalyzer()

    @property
    def id(self) -> str:
        return "c"

    @property
    def display_name(self) -> str:
        return "C"

    @property
    def extensions(self) -> List[str]:
        return [".c", ".h"]

    @property
    def parser(self) -> BaseParser:
        return self._parser

    @property
    def analyzer(self) -> BaseAnalyzer:
        return self._analyzer

    @property
    def is_supported(self) -> bool:
        return True

    def detect_heuristics(self, source_code: str) -> float:
        c_patterns = [
            r"#include\s+<stdio\.h>",
            r"#include\s+<stdlib\.h>",
            r"\bprintf\(",
            r"\bint\s+main\s*\(",
            r"\bstruct\s+[a-zA-Z_]\w*\s*\{",
        ]
        matches = sum(1 for p in c_patterns if re.search(p, source_code))
        if matches >= 2:
            return 0.90
        if matches == 1:
            return 0.70
        return 0.0
