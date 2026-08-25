"""C++ language definition module."""

from __future__ import annotations

import re
from typing import List
from ...base import BaseAnalyzer, BaseLanguage, BaseParser
from .cpp_analyzer import CPPAnalyzer
from .cpp_parser import CPPParser


class CPPLanguage(BaseLanguage):
    """C++ language definition and adapter."""

    def __init__(self):
        self._parser = CPPParser()
        self._analyzer = CPPAnalyzer()

    @property
    def id(self) -> str:
        return "cpp"

    @property
    def display_name(self) -> str:
        return "C++"

    @property
    def extensions(self) -> List[str]:
        return [".cpp", ".hpp", ".cc", ".cxx", ".hh"]

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
        cpp_patterns = [
            r"#include\s+<iostream>",
            r"#include\s+<vector>",
            r"\bstd::cout\b",
            r"\busing\s+namespace\s+std;",
            r"\btemplate\s*<",
            r"\bclass\s+[a-zA-Z_]\w*\s*\{",
        ]
        matches = sum(1 for p in cpp_patterns if re.search(p, source_code))
        if matches >= 2:
            return 0.90
        if matches == 1:
            return 0.75
        return 0.0
