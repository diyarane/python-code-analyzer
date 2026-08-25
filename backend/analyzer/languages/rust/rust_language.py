"""Rust language definition module."""

from __future__ import annotations

import re
from typing import List
from ...base import BaseAnalyzer, BaseLanguage, BaseParser
from .rust_analyzer import RustAnalyzer
from .rust_parser import RustParser


class RustLanguage(BaseLanguage):
    """Rust language definition and adapter."""

    def __init__(self):
        self._parser = RustParser()
        self._analyzer = RustAnalyzer()

    @property
    def id(self) -> str:
        return "rust"

    @property
    def display_name(self) -> str:
        return "Rust"

    @property
    def extensions(self) -> List[str]:
        return [".rs"]

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
        rust_patterns = [
            r"\bfn\s+[a-z_]\w*\(",
            r"\blet\s+mut\s+",
            r"\bprintln!\(",
            r"\bstruct\s+[A-Z]\w*\s*\{",
            r"\bimpl\s+[A-Z]\w*",
            r"\bmatch\s+[a-z_]",
        ]
        matches = sum(1 for p in rust_patterns if re.search(p, source_code))
        if matches >= 2:
            return 0.90
        if matches == 1:
            return 0.70
        return 0.0
