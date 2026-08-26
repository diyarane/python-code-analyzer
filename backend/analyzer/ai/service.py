"""
AI Explanation Service Manager for CodeAnalyzer AI.
Coordinates context construction, provider selection, configuration inspection, and execution.
"""

from __future__ import annotations

import os
from typing import Any, Dict, Optional

from analyzer.ai.context import AIExplanationContext
from analyzer.ai.provider import (
    AI_PROVIDER_REGISTRY,
    BaseAIProvider,
    FallbackAIProvider,
)


class AIExplanationService:
    """Manager service for AI Code Explanations."""

    def __init__(
        self,
        provider_name: Optional[str] = None,
        model_name: Optional[str] = None,
        api_key: Optional[str] = None,
    ):
        self.provider_name = (
            provider_name or os.environ.get("AI_PROVIDER", "none")
        ).lower().strip()
        self.model_name = model_name or os.environ.get("AI_MODEL", "")
        self.api_key = api_key or os.environ.get("AI_API_KEY", "")

        self._active_provider = self._initialize_provider()

    def _initialize_provider(self) -> BaseAIProvider:
        provider_cls = AI_PROVIDER_REGISTRY.get(self.provider_name, FallbackAIProvider)
        try:
            provider_inst = provider_cls()
            if not provider_inst.is_configured() and self.provider_name not in ("none", "fallback"):
                # Graceful fallback to FallbackAIProvider if API key is missing
                return FallbackAIProvider()
            return provider_inst
        except Exception:
            return FallbackAIProvider()

    def is_provider_configured(self) -> bool:
        """Check whether the active AI provider is fully configured with credentials."""
        return self._active_provider.is_configured()

    def explain(self, context: AIExplanationContext) -> Dict[str, Any]:
        """
        Execute explanation generation for the given context.
        Returns a structured dictionary response.
        """
        if not context.source_code or not context.source_code.strip():
            return {
                "success": False,
                "error": "EmptyCode",
                "message": "No code was provided for explanation.",
                "provider_configured": self.is_provider_configured(),
                "provider": self._active_provider.name,
            }

        return self._active_provider.generate_explanation(context)


_service_instance: Optional[AIExplanationService] = None


def get_ai_explanation_service(force_reload: bool = False) -> AIExplanationService:
    """Singleton getter for AIExplanationService."""
    global _service_instance
    if _service_instance is None or force_reload:
        _service_instance = AIExplanationService()
    return _service_instance
