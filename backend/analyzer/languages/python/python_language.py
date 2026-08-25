"""Python language definition module."""

from __future__ import annotations

from typing import List
from ...base import BaseAnalyzer, BaseLanguage, BaseParser
from .python_analyzer import PythonAnalyzer
from .python_parser import PythonParser


class PythonLanguage(BaseLanguage):
    """Python language definition and adapter."""

    def __init__(self):
        self._parser = PythonParser()
        self._analyzer = PythonAnalyzer()

    @property
    def id(self) -> str:
        return "python"

    @property
    def display_name(self) -> str:
        return "Python"

    @property
    def extensions(self) -> List[str]:
        return [".py", ".pyw", ".pyi"]

    @property
    def parser(self) -> BaseParser:
        return self._parser

    @property
    def analyzer(self) -> BaseAnalyzer:
        return self._analyzer

    def detect_heuristics(self, source_code: str) -> bool:
        keywords = ["def ", "import ", "from ", "class ", "elif ", "self.", "print("]
        return any(kw in source_code for kw in keywords)
