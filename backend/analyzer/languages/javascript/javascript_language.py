"""JavaScript and JavaScript/JSX language adapter definitions."""

from __future__ import annotations

import re
from typing import List
from ...base import BaseAnalyzer, BaseLanguage, BaseParser
from .javascript_analyzer import JavaScriptAnalyzer
from .javascript_parser import JavaScriptParser


class JavaScriptLanguage(BaseLanguage):
    """JavaScript language definition and adapter."""

    def __init__(self):
        self._parser = JavaScriptParser(is_jsx=False)
        self._analyzer = JavaScriptAnalyzer()

    @property
    def id(self) -> str:
        return "javascript"

    @property
    def display_name(self) -> str:
        return "JavaScript"

    @property
    def extensions(self) -> List[str]:
        return [".js", ".mjs", ".cjs"]

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
        js_patterns = [
            r"\b(const|let|var)\s+[a-zA-Z_$]",
            r"\bfunction\s*\w*\(",
            r"\bexport\s+(default|const|function|class)\b",
            r"\bimport\s+.*\s+from\s+['\"]",
            r"\bconsole\.log\(",
            r"=>",
        ]
        matches = sum(1 for p in js_patterns if re.search(p, source_code))
        if matches >= 3:
            return 0.85
        if matches >= 1:
            return 0.65
        return 0.0


class JavaScriptJSXLanguage(BaseLanguage):
    """JavaScript/JSX language definition and adapter."""

    def __init__(self):
        self._parser = JavaScriptParser(is_jsx=True)
        self._analyzer = JavaScriptAnalyzer()

    @property
    def id(self) -> str:
        return "javascript_jsx"

    @property
    def display_name(self) -> str:
        return "JavaScript/JSX"

    @property
    def extensions(self) -> List[str]:
        return [".jsx"]

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
        jsx_patterns = [
            r"<[A-Z][a-zA-Z0-9]*\s*/>",
            r"<[A-Z][a-zA-Z0-9]*[\s>]",
            r"className=",
            r"onClick=\{",
        ]
        matches = sum(1 for p in jsx_patterns if re.search(p, source_code))
        return 0.90 if matches >= 2 else 0.70 if matches == 1 else 0.0
