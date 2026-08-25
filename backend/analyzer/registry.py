"""
Central registry for supported programming languages in CodeAnalyzer AI.
"""

from __future__ import annotations

from typing import Dict, List, Optional
from .base import BaseLanguage
from .languages.python.python_language import PythonLanguage


class LanguageRegistry:
    """Central registry mapping language identifiers and file extensions to language adapters."""

    def __init__(self):
        self._languages: Dict[str, BaseLanguage] = {}
        self._extension_map: Dict[str, BaseLanguage] = {}
        self.register(PythonLanguage())

    def register(self, language: BaseLanguage):
        """Register a language instance."""
        lang_id = language.id.lower()
        self._languages[lang_id] = language

        for ext in language.extensions:
            self._extension_map[ext.lower()] = language

    def get(self, identifier_or_ext: Optional[str] = None) -> BaseLanguage:
        """
        Retrieve a language instance by ID, extension, or filename.
        Defaults to 'python' if not found.
        """
        if not identifier_or_ext:
            return self._languages["python"]

        clean_id = identifier_or_ext.lower().strip()

        # Check direct language ID match (e.g. 'python')
        if clean_id in self._languages:
            return self._languages[clean_id]

        # Check extension match (e.g. '.py' or 'file.py')
        ext = "." + clean_id.rsplit(".", 1)[-1] if "." in clean_id else clean_id
        if not ext.startswith("."):
            ext = "." + ext

        if ext in self._extension_map:
            return self._extension_map[ext]

        # Fallback default
        return self._languages["python"]

    def detect_language(
        self,
        source_code: str,
        filename: Optional[str] = None,
        requested_language: Optional[str] = None,
    ) -> BaseLanguage:
        """Detect language from explicit request, filename extension, or code heuristics."""
        if requested_language and requested_language.strip():
            return self.get(requested_language)

        if filename and "." in filename:
            ext = "." + filename.rsplit(".", 1)[-1].lower()
            if ext in self._extension_map:
                return self._extension_map[ext]

        for lang in self._languages.values():
            if lang.detect_heuristics(source_code):
                return lang

        return self._languages["python"]

    def list_languages(self) -> List[Dict[str, Any]]:
        """Return metadata list of all supported languages."""
        return [
            {
                "id": lang.id,
                "display_name": lang.display_name,
                "extensions": lang.extensions,
            }
            for lang in self._languages.values()
        ]


# Singleton instance
registry = LanguageRegistry()
