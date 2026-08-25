"""Java language definition module."""

from __future__ import annotations

import re
from typing import List
from ...base import BaseAnalyzer, BaseLanguage, BaseParser
from .java_analyzer import JavaAnalyzer
from .java_parser import JavaParser


class JavaLanguage(BaseLanguage):
    """Java language definition and adapter."""

    def __init__(self):
        self._parser = JavaParser()
        self._analyzer = JavaAnalyzer()

    @property
    def id(self) -> str:
        return "java"

    @property
    def display_name(self) -> str:
        return "Java"

    @property
    def extensions(self) -> List[str]:
        return [".java"]

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
        java_patterns = [
            r"\bpublic\s+(class|interface|enum)\s+[A-Z]",
            r"\bpublic\s+static\s+void\s+main\b",
            r"\bSystem\.out\.print",
            r"\bpackage\s+[a-z0-9_.]+",
            r"\bimport\s+java\.",
        ]
        matches = sum(1 for p in java_patterns if re.search(p, source_code))
        if matches >= 2:
            return 0.90
        if matches == 1:
            return 0.70
        return 0.0
