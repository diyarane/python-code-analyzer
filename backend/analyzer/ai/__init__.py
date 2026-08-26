"""
AI Explanation Module for CodeAnalyzer AI.
Provides a provider-agnostic interface for generating AI explanations.
"""

from analyzer.ai.context import AIExplanationContext
from analyzer.ai.provider import BaseAIProvider, FallbackAIProvider, AI_PROVIDER_REGISTRY
from analyzer.ai.service import AIExplanationService, get_ai_explanation_service

__all__ = [
    "AIExplanationContext",
    "BaseAIProvider",
    "FallbackAIProvider",
    "AI_PROVIDER_REGISTRY",
    "AIExplanationService",
    "get_ai_explanation_service",
]
