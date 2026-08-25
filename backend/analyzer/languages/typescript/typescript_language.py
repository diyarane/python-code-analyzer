"""TypeScript and TypeScript/TSX language adapter definitions."""

from __future__ import annotations

import re
from typing import List
from ...base import BaseAnalyzer, BaseLanguage, BaseParser
from .typescript_analyzer import TypeScriptAnalyzer
from .typescript_parser import TypeScriptParser


class TypeScriptLanguage(BaseLanguage):
    """TypeScript language definition and adapter."""

    def __init__(self):
        self._parser = TypeScriptParser(is_tsx=False)
        self._analyzer = TypeScriptAnalyzer()

    @property
    def id(self) -> str:
        return "typescript"

    @property
    def display_name(self) -> str:
        return "TypeScript"

    @property
    def extensions(self) -> List[str]:
        return [".ts", ".mts", ".cts"]

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
        ts_patterns = [
            r"\binterface\s+[A-Z]",
            r"\btype\s+[A-Z]\w*\s*=",
            r":\s*(string|number|boolean|any|void|unknown|never)\b",
            r"\bas\s+[A-Z]\w*",
            r"\bpublic\s+|\bprivate\s+|\bprotected\s+",
        ]
        matches = sum(1 for p in ts_patterns if re.search(p, source_code))
        if matches >= 2:
            return 0.90
        if matches == 1:
            return 0.75
        return 0.0


class TypeScriptTSXLanguage(BaseLanguage):
    """TypeScript/TSX language definition and adapter."""

    def __init__(self):
        self._parser = TypeScriptParser(is_tsx=True)
        self._analyzer = TypeScriptAnalyzer()

    @property
    def id(self) -> str:
        return "typescript_tsx"

    @property
    def display_name(self) -> str:
        return "TypeScript/TSX"

    @property
    def extensions(self) -> List[str]:
        return [".tsx"]

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
        tsx_patterns = [
            r"React\.FC<",
            r"<[A-Z][a-zA-Z0-9]*<.*>\s*/>",
            r"interface\s+.*Props\b",
        ]
        matches = sum(1 for p in tsx_patterns if re.search(p, source_code))
        return 0.95 if matches >= 1 else 0.0
