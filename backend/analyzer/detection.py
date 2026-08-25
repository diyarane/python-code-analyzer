"""
Unified Language Detection Service for CodeAnalyzer AI.

Determines programming language from:
1. Explicit language selection override (source="manual", confidence=1.0)
2. Uploaded file extensions mapped via LanguageRegistry (source="extension", confidence=0.95)
3. Pasted code syntax/signature heuristics (source="content", confidence=0.60–0.95)
4. Ambiguous / unknown code fallback (language="unknown", source="unknown", confidence=0.0)
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, Optional
from .registry import registry


@dataclass
class DetectionResult:
    language: str
    display_name: str
    source: str  # "manual" | "extension" | "content" | "unknown"
    confidence: float
    supported: bool

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class LanguageDetectionService:
    """Service handling language identification and confidence scoring."""

    def detect(
        self,
        source_code: str = "",
        filename: Optional[str] = None,
        requested_language: Optional[str] = None,
    ) -> DetectionResult:
        """
        Detect programming language in priority order:
        1. Explicit selection
        2. File extension
        3. Content heuristics
        4. Unknown fallback
        """
        # 1. Explicit language selection override
        if requested_language and requested_language.strip():
            lang = registry.get(requested_language)
            if lang:
                return DetectionResult(
                    language=lang.id,
                    display_name=lang.display_name,
                    source="manual",
                    confidence=1.0,
                    supported=lang.is_supported,
                )
            # If explicit request is unknown string (e.g. 'ruby')
            clean_req = requested_language.strip().lower()
            return DetectionResult(
                language=clean_req,
                display_name=clean_req.capitalize(),
                source="manual",
                confidence=1.0,
                supported=False,
            )

        # 2. Uploaded file extension mapping
        if filename and "." in filename:
            ext = "." + filename.rsplit(".", 1)[-1].lower()
            lang = registry.get(ext)
            if lang:
                return DetectionResult(
                    language=lang.id,
                    display_name=lang.display_name,
                    source="extension",
                    confidence=0.95,
                    supported=lang.is_supported,
                )

        # 3. Pasted code content heuristics
        if source_code and source_code.strip():
            best_lang = None
            best_confidence = 0.0

            for lang in registry._languages.values():
                score = lang.detect_heuristics(source_code)
                if score > best_confidence:
                    best_confidence = score
                    best_lang = lang

            # Only return content match if confidence >= 0.60
            if best_lang and best_confidence >= 0.60:
                return DetectionResult(
                    language=best_lang.id,
                    display_name=best_lang.display_name,
                    source="content",
                    confidence=round(best_confidence, 2),
                    supported=best_lang.is_supported,
                )

        # 4. Fallback for ambiguous/unknown code
        return DetectionResult(
            language="unknown",
            display_name="Unknown",
            source="unknown",
            confidence=0.0,
            supported=False,
        )


# Singleton instance
detector = LanguageDetectionService()
