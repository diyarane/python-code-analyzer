"""
Provider Interface and Default Fallback Provider for CodeAnalyzer AI Explanation Service.
Design allows LLM providers (OpenAI, Grok, Anthropic, etc.) to plug in seamlessly.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, Type

from analyzer.ai.context import AIExplanationContext
from analyzer.explanation_builder import generate_language_aware_explanations


class BaseAIProvider(ABC):
    """Abstract Base Class for AI Explanation Providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Identifier name for the AI provider (e.g., 'openai', 'grok', 'none')."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Return True if required API keys or credentials are configured."""
        pass

    @abstractmethod
    def generate_explanation(self, context: AIExplanationContext) -> Dict[str, Any]:
        """Generate structured AI explanation dictionary from analysis context."""
        pass


class FallbackAIProvider(BaseAIProvider):
    """
    Default Fallback Provider when no external LLM API key is configured.
    Uses deterministic, language-aware rule-based explanations.
    """

    @property
    def name(self) -> str:
        return "none"

    def is_configured(self) -> bool:
        return False

    def generate_explanation(self, context: AIExplanationContext) -> Dict[str, Any]:
        explanation = context.fallback_explanation

        if not explanation:
            metrics_dict = {
                "time_complexity": context.time_complexity,
                "space_complexity": context.space_complexity,
                "optimization_score": context.optimization_score,
                "dead_code_count": context.dead_code_count,
            }
            explanation = generate_language_aware_explanations(context.language, metrics_dict)

        return {
            "success": True,
            "provider_configured": False,
            "provider": self.name,
            "explanation": explanation,
            "metadata": {
                "model": None,
                "fallback_used": True,
                "reason": "No external LLM provider key configured. Using deterministic analyzer rules.",
            },
        }


# Extensible Provider Registry
AI_PROVIDER_REGISTRY: Dict[str, Type[BaseAIProvider]] = {
    "none": FallbackAIProvider,
    "fallback": FallbackAIProvider,
}


def register_ai_provider(provider_key: str, provider_cls: Type[BaseAIProvider]) -> None:
    """Register a new AI provider class dynamically."""
    AI_PROVIDER_REGISTRY[provider_key.lower().strip()] = provider_cls
