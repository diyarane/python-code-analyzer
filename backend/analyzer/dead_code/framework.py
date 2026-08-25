"""
Base Dead Code Analyzer Interface & Unsupported Fallback.
"""

from __future__ import annotations

from typing import Any
from .models import DeadCodeCapability, DeadCodeFinding, DeadCodeResult


class BaseDeadCodeAnalyzer:
    """Abstract interface for language-specific dead-code analyzer passes."""

    def get_capability(self) -> DeadCodeCapability:
        raise NotImplementedError

    def analyze(self, syntax_tree: Any, source_code: str) -> DeadCodeResult:
        raise NotImplementedError


class UnsupportedDeadCodeAnalyzer(BaseDeadCodeAnalyzer):
    """Fallback analyzer for language adapters that do not yet implement dead-code analysis."""

    def __init__(self, language_display_name: str):
        self.language_display_name = language_display_name
        self.reason_text = (
            f"Dead-code detection is not currently implemented for {self.language_display_name} in this analyzer."
        )

    def get_capability(self) -> DeadCodeCapability:
        return DeadCodeCapability(
            supported=False,
            categories=[],
            reason=self.reason_text,
        )

    def analyze(self, syntax_tree: Any, source_code: str) -> DeadCodeResult:
        capability = self.get_capability()
        return DeadCodeResult(
            supported=False,
            count=0,
            findings=[],
            capability=capability,
            reason=self.reason_text,
        )
