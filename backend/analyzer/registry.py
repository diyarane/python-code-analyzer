"""
Central registry for supported and detectable programming languages in CodeAnalyzer AI.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from .base import BaseLanguage
from .languages.python.python_language import PythonLanguage
from .languages.javascript import JavaScriptLanguage, JavaScriptJSXLanguage
from .languages.typescript import TypeScriptLanguage, TypeScriptTSXLanguage


class LanguageRegistry:
    """Central registry mapping language identifiers and file extensions to language adapters."""

    def __init__(self):
        self._languages: Dict[str, BaseLanguage] = {}
        self._extension_map: Dict[str, BaseLanguage] = {}

        # Register language adapters
        self.register(PythonLanguage())
        self.register(JavaScriptLanguage())
        self.register(JavaScriptJSXLanguage())
        self.register(TypeScriptLanguage())
        self.register(TypeScriptTSXLanguage())

    def register(self, language: BaseLanguage):
        """Register a language instance."""
        lang_id = language.id.lower()
        self._languages[lang_id] = language

        for ext in language.extensions:
            self._extension_map[ext.lower()] = language

    def get(self, identifier_or_ext: Optional[str] = None) -> Optional[BaseLanguage]:
        """
        Retrieve a language instance by ID, extension, or filename.
        Returns None if not found.
        """
        if not identifier_or_ext:
            return self._languages.get("python")

        clean_id = identifier_or_ext.lower().strip()

        # Check direct language ID match
        if clean_id in self._languages:
            return self._languages[clean_id]

        # Check extension match
        ext = "." + clean_id.rsplit(".", 1)[-1] if "." in clean_id else clean_id
        if not ext.startswith("."):
            ext = "." + ext

        if ext in self._extension_map:
            return self._extension_map[ext]

        return None

    def list_languages(self) -> List[Dict[str, Any]]:
        """Return metadata list of all supported and detectable languages."""
        return [
            {
                "id": lang.id,
                "display_name": lang.display_name,
                "extensions": lang.extensions,
                "is_supported": lang.is_supported,
            }
            for lang in self._languages.values()
        ]


# Singleton instance
registry = LanguageRegistry()
