"""
Base abstractions and contracts for multi-language code analysis.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Optional


class NormalizedSyntaxTree:
    """Wrapper holding parsed AST node representation and source metadata."""

    def __init__(self, raw_tree: Any, source_code: str, language_id: str):
        self.raw_tree = raw_tree
        self.source_code = source_code
        self.language_id = language_id


class BaseParser(ABC):
    """Abstract base class for language-specific code parsers."""

    @abstractmethod
    def parse(self, source_code: str) -> NormalizedSyntaxTree:
        """
        Parse source code string into a NormalizedSyntaxTree.
        Raises SyntaxError or ValueError on parse failure.
        """
        pass


class BaseAnalyzer(ABC):
    """Abstract base class for language-specific analysis engines."""

    @abstractmethod
    def analyze(
        self,
        tree: NormalizedSyntaxTree,
        source_code: str,
        progress_callback: Optional[Callable[[str, Dict[str, Any]], None]] = None,
    ) -> Dict[str, Any]:
        """
        Analyze a NormalizedSyntaxTree and return a normalized analysis dictionary:
        {
            "success": bool,
            "language": str,
            "ast": dict,
            "metrics": dict,
            "explanations": dict,
            "warnings": list,
            "node_count": int
        }
        """
        pass


class BaseLanguage(ABC):
    """Abstract base class representing a supported programming language."""

    @property
    @abstractmethod
    def id(self) -> str:
        """Unique language identifier, e.g., 'python'."""
        pass

    @property
    @abstractmethod
    def display_name(self) -> str:
        """Human-readable display name, e.g., 'Python'."""
        pass

    @property
    @abstractmethod
    def extensions(self) -> List[str]:
        """Supported file extensions, e.g., ['.py', '.pyw']."""
        pass

    @property
    @abstractmethod
    def parser(self) -> BaseParser:
        """Parser instance for this language."""
        pass

    @property
    @abstractmethod
    def analyzer(self) -> BaseAnalyzer:
        """Analyzer instance for this language."""
        pass

    def matches_extension(self, filename: str) -> bool:
        """Check if filename extension matches this language."""
        ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        return ext in [e.lower() for e in self.extensions]

    def detect_heuristics(self, source_code: str) -> bool:
        """Return True if source code heuristics strongly indicate this language."""
        return False
