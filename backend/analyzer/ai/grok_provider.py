"""
xAI Grok Provider for CodeAnalyzer AI Explanation Service.
Connects to xAI API (https://api.x.ai/v1) via OpenAI-compatible SDK using XAI_API_KEY.
"""

from __future__ import annotations

import json
import os
import time
from typing import Any, Dict, List, Optional

from analyzer.ai.context import AIExplanationContext
from analyzer.ai.provider import BaseAIProvider, FallbackAIProvider, register_ai_provider

GROK_SYSTEM_PROMPT = """
You are an expert static code analysis and software engineering assistant for CodeAnalyzer AI.
Your role is to analyze source code alongside static analysis metrics and provide clear, actionable, technical insights.

Guidelines:
1. Distinguish functional correctness from asymptotic efficiency, memory usage, and maintainability.
2. Identify algorithmic inefficiencies that static AST metrics alone may not capture (e.g. O(N^2) Bubble Sort vs O(N log N) sorting algorithms, inefficient string concatenations inside loops, redundant lookups, unoptimized data structures).
3. Recognize common algorithms and data structures, and suggest standard library or optimal algorithmic alternatives when appropriate.
4. Explain clearly WHY a recommendation is superior (e.g. O(N log N) vs O(N^2) scaling, cache locality, memory overhead).
5. Consider the specific programming language, its standard library idioms, and best practices.
6. Avoid claiming a bug or inefficiency exists unless the provided code or analysis clearly supports it. State clearly when the current implementation is already clean and reasonable.
7. Provide actionable recommendations rather than generic praise.

You MUST respond ONLY with a valid JSON object matching this exact schema:
{
    "summary": "<High-level summary of code structure, functional correctness, and algorithmic efficiency>",
    "time": "<Explanation of time complexity, highlighting any asymptotic bottlenecks>",
    "space": "<Explanation of space complexity, allocations, and stack/heap usage>",
    "optimization": "<Key optimization insights and structural recommendations>",
    "recommendations": [
        "<Actionable recommendation 1>",
        "<Actionable recommendation 2>"
    ]
}
"""


class GrokAIProvider(BaseAIProvider):
    """
    xAI Grok AI Provider.
    Uses OpenAI-compatible SDK with base_url="https://api.x.ai/v1" and key XAI_API_KEY.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self._api_key = (api_key or os.environ.get("XAI_API_KEY") or "").strip()
        self._model = (
            model
            or os.environ.get("XAI_MODEL")
            or os.environ.get("AI_MODEL")
            or "grok-2-latest"
        ).strip()
        self._base_url = (
            base_url
            or os.environ.get("XAI_BASE_URL")
            or "https://api.x.ai/v1"
        ).strip()

    @property
    def name(self) -> str:
        return "grok"

    def is_configured(self) -> bool:
        """Return True if XAI_API_KEY is non-empty."""
        return bool(self._api_key)

    def _build_user_prompt(self, context: AIExplanationContext) -> str:
        dead_code_info = (
            f"{context.dead_code_count} finding(s)"
            if context.dead_code_count is not None
            else "Unsupported / None"
        )
        fallback_summary = (
            context.fallback_explanation.get("summary")
            if context.fallback_explanation
            else "None"
        )

        return f"""
Source Code ({context.language}):
```{context.language}
{context.source_code}
```

Static Analysis Context:
- Programming Language: {context.language}
- Estimated Time Complexity: {context.time_complexity}
- Estimated Space Complexity: {context.space_complexity}
- Optimization Score: {context.optimization_score}/100
- Dead Code Findings Count: {dead_code_info}
- Dead Code Findings Details: {json.dumps(context.dead_code_findings)}
- Deterministic Analyzer Rule Summary: {fallback_summary}

Analyze this code carefully. Identify any algorithmic bottlenecks (such as O(N^2) sorting or quadratic loops) and provide recommendations.
Respond ONLY with the requested JSON object.
"""

    def generate_explanation(self, context: AIExplanationContext) -> Dict[str, Any]:
        """
        Generate AI explanation via xAI Grok API.
        Falls back gracefully to FallbackAIProvider on configuration error, network timeout, or API failure.
        """
        if not self.is_configured():
            fallback_res = FallbackAIProvider().generate_explanation(context)
            fallback_res["metadata"]["reason"] = "XAI_API_KEY environment variable is not configured."
            return fallback_res

        try:
            import openai
        except ImportError:
            fallback_res = FallbackAIProvider().generate_explanation(context)
            fallback_res["metadata"]["reason"] = "openai SDK is not installed in the python environment."
            return fallback_res

        start_time = time.time()
        user_prompt = self._build_user_prompt(context)

        try:
            client = openai.OpenAI(
                api_key=self._api_key,
                base_url=self._base_url,
                timeout=15.0,
            )

            response = client.chat.completions.create(
                model=self._model,
                messages=[
                    {"role": "system", "content": GROK_SYSTEM_PROMPT.strip()},
                    {"role": "user", "content": user_prompt.strip()},
                ],
                temperature=0.2,
                max_tokens=1000,
            )

            latency_ms = int((time.time() - start_time) * 1000)

            content = response.choices[0].message.content or ""
            parsed = self._clean_and_parse_json(content)

            if not parsed or not isinstance(parsed, dict) or "summary" not in parsed:
                # Malformed JSON recovery fallback
                fallback_res = FallbackAIProvider().generate_explanation(context)
                fallback_res["provider_configured"] = True
                fallback_res["provider"] = self.name
                fallback_res["metadata"]["fallback_used"] = True
                fallback_res["metadata"]["reason"] = "Grok API returned malformed JSON payload."
                fallback_res["metadata"]["raw_content"] = content[:200]
                return fallback_res

            explanation = {
                "summary": str(parsed.get("summary", "")),
                "time": str(parsed.get("time", "")),
                "space": str(parsed.get("space", "")),
                "optimization": str(parsed.get("optimization", "")),
            }
            recommendations = parsed.get("recommendations", [])
            if not isinstance(recommendations, list):
                recommendations = [str(recommendations)]

            return {
                "success": True,
                "provider_configured": True,
                "provider": self.name,
                "explanation": explanation,
                "recommendations": [str(r) for r in recommendations],
                "metadata": {
                    "model": self._model,
                    "fallback_used": False,
                    "latency_ms": latency_ms,
                },
            }

        except Exception as err:
            latency_ms = int((time.time() - start_time) * 1000)
            fallback_res = FallbackAIProvider().generate_explanation(context)
            fallback_res["provider_configured"] = True
            fallback_res["provider"] = self.name
            fallback_res["metadata"]["fallback_used"] = True
            fallback_res["metadata"]["reason"] = f"Grok API error: {str(err)}"
            fallback_res["metadata"]["latency_ms"] = latency_ms
            return fallback_res

    def _clean_and_parse_json(self, raw_content: str) -> Optional[Dict[str, Any]]:
        """Clean markdown code block wrappers ```json ... ``` and parse JSON safely."""
        text = raw_content.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        try:
            return json.loads(text)
        except Exception:
            return None


# Register provider cleanly upon module load
register_ai_provider("grok", GrokAIProvider)
register_ai_provider("xai", GrokAIProvider)
