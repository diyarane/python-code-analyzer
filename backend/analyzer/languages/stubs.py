"""
Stub language definitions for pending language parsers (JavaScript, JSX, TypeScript, TSX).
Allows detection layer to recognize files/code before full AST parsers are added.
"""

from __future__ import annotations

import re
from typing import List
from ..base import BaseAnalyzer, BaseLanguage, BaseParser, NormalizedSyntaxTree


class DummyParser(BaseParser):
    def parse(self, source_code: str) -> NormalizedSyntaxTree:
        raise NotImplementedError("AST parser for this language is coming soon.")


class DummyAnalyzer(BaseAnalyzer):
    def analyze(self, tree: NormalizedSyntaxTree, source_code: str, progress_callback=None) -> dict:
        raise NotImplementedError("Analysis engine for this language is coming soon.")


_dummy_parser = DummyParser()
_dummy_analyzer = DummyAnalyzer()


class JavaScriptLanguage(BaseLanguage):
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
        return _dummy_parser

    @property
    def analyzer(self) -> BaseAnalyzer:
        return _dummy_analyzer

    @property
    def is_supported(self) -> bool:
        return False

    def detect_heuristics(self, source_code: str) -> float:
        js_patterns = [
            r"\b(const|let|var)\s+[a-zA-Z_$]",
            r"\bfunction\s*\w*\(",
            r"\bexport\s+(default|const|function|class)\b",
            r"\bimport\s+.*\s+from\s+['\"]",
            r"\bconsole\.log\(",
            r"=>",
            r"\bdocument\.getElementById\(",
        ]
        matches = sum(1 for p in js_patterns if re.search(p, source_code))
        if matches >= 3:
            return 0.85
        if matches >= 1:
            return 0.65
        return 0.0


class JavaScriptJSXLanguage(BaseLanguage):
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
        return _dummy_parser

    @property
    def analyzer(self) -> BaseAnalyzer:
        return _dummy_analyzer

    @property
    def is_supported(self) -> bool:
        return False

    def detect_heuristics(self, source_code: str) -> float:
        jsx_patterns = [
            r"<[A-Z][a-zA-Z0-9]*\s*/>",
            r"<[A-Z][a-zA-Z0-9]*[\s>]",
            r"className=",
            r"onClick=\{",
        ]
        matches = sum(1 for p in jsx_patterns if re.search(p, source_code))
        return 0.90 if matches >= 2 else 0.70 if matches == 1 else 0.0


class TypeScriptLanguage(BaseLanguage):
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
        return _dummy_parser

    @property
    def analyzer(self) -> BaseAnalyzer:
        return _dummy_analyzer

    @property
    def is_supported(self) -> bool:
        return False

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
        return _dummy_parser

    @property
    def analyzer(self) -> BaseAnalyzer:
        return _dummy_analyzer

    @property
    def is_supported(self) -> bool:
        return False

    def detect_heuristics(self, source_code: str) -> float:
        tsx_patterns = [
            r"React\.FC<",
            r"<[A-Z][a-zA-Z0-9]*<.*>\s*/>",
            r"interface\s+.*Props\b",
        ]
        matches = sum(1 for p in tsx_patterns if re.search(p, source_code))
        return 0.95 if matches >= 1 else 0.0
