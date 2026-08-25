"""Go language definition module."""

from __future__ import annotations

import re
from typing import List
from ...base import BaseAnalyzer, BaseLanguage, BaseParser
from .go_analyzer import GoAnalyzer
from .go_parser import GoParser


class GoLanguage(BaseLanguage):
    """Go language definition and adapter."""

    def __init__(self):
        self._parser = GoParser()
        self._analyzer = GoAnalyzer()

    @property
    def id(self) -> str:
        return "go"

    @property
    def display_name(self) -> str:
        return "Go"

    @property
    def extensions(self) -> List[str]:
        return [".go"]

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
        go_patterns = [
            r"\bpackage\s+main\b",
            r"\bfunc\s+[a-zA-Z_]\w*\(",
            r"\bfmt\.Print",
            r"\btype\s+[A-Z]\w*\s+struct\b",
            r"\bgo\s+func\(",
        ]
        matches = sum(1 for p in go_patterns if re.search(p, source_code))
        if matches >= 2:
            return 0.90
        if matches == 1:
            return 0.70
        return 0.0
