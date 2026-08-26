"""
Automated Test Suite for Provider-Agnostic AI Explanation Architecture.
Verifies service context construction, unconfigured provider fallback, endpoint contract,
and pluggable LLM provider extensibility.
"""

import json
import unittest
from app import app
from analyzer.ai.context import AIExplanationContext
from analyzer.ai.provider import BaseAIProvider, register_ai_provider
from analyzer.ai.service import AIExplanationService, get_ai_explanation_service
from analyzer.explanation_builder import generate_language_aware_explanations


class DummyLLMProvider(BaseAIProvider):
    """Test Mock LLM Provider for verifying registry extensibility."""

    @property
    def name(self) -> str:
        return "dummy_llm"

    def is_configured(self) -> bool:
        return True

    def generate_explanation(self, context: AIExplanationContext) -> dict:
        return {
            "success": True,
            "provider_configured": True,
            "provider": self.name,
            "explanation": {
                "summary": f"Dummy LLM analyzed {context.language} code.",
                "time": f"Complexity is {context.time_complexity}.",
                "space": f"Memory is {context.space_complexity}.",
                "optimization": f"Score {context.optimization_score}/100.",
            },
            "metadata": {
                "model": "dummy-v1",
                "fallback_used": False,
            },
        }


class TestAIService(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_context_construction_from_dict(self):
        payload = {
            "code": "def foo():\n    return 42",
            "language": "python",
            "metrics": {
                "time_complexity": "O(1)",
                "space_complexity": "O(1)",
                "optimization_score": 95,
                "dead_code_count": 0,
            },
            "explanations": {
                "summary": "Sample summary",
                "time": "Sample time",
                "space": "Sample space",
                "optimization": "Sample opt",
            },
        }
        ctx = AIExplanationContext.from_dict(payload)
        self.assertEqual(ctx.source_code, "def foo():\n    return 42")
        self.assertEqual(ctx.language, "python")
        self.assertEqual(ctx.time_complexity, "O(1)")
        self.assertEqual(ctx.space_complexity, "O(1)")
        self.assertEqual(ctx.optimization_score, 95)
        self.assertEqual(ctx.dead_code_count, 0)
        self.assertIsNotNone(ctx.fallback_explanation)
        self.assertEqual(ctx.fallback_explanation["summary"], "Sample summary")

    def test_provider_not_configured_fallback_behavior(self):
        service = AIExplanationService(provider_name="none")
        self.assertFalse(service.is_provider_configured())

        ctx = AIExplanationContext(
            source_code="function add(a, b) { return a + b; }",
            language="javascript",
            time_complexity="O(1)",
            space_complexity="O(1)",
            optimization_score=100,
        )
        res = service.explain(ctx)

        self.assertTrue(res.get("success"))
        self.assertFalse(res.get("provider_configured"))
        self.assertEqual(res.get("provider"), "none")
        self.assertIn("explanation", res)
        self.assertIn("JavaScript", res["explanation"]["summary"])
        self.assertTrue(res["metadata"]["fallback_used"])

    def test_preservation_of_rule_based_explanations(self):
        metrics = {
            "time_complexity": "O(N)",
            "space_complexity": "O(1)",
            "optimization_score": 85,
            "dead_code_count": 1,
        }
        deterministic = generate_language_aware_explanations("cpp", metrics)

        ctx = AIExplanationContext(
            source_code="int main() { return 0; }",
            language="cpp",
            time_complexity="O(N)",
            space_complexity="O(1)",
            optimization_score=85,
            dead_code_count=1,
            fallback_explanation=deterministic,
        )

        service = get_ai_explanation_service(force_reload=True)
        res = service.explain(ctx)

        self.assertEqual(res["explanation"]["summary"], deterministic["summary"])
        self.assertEqual(res["explanation"]["time"], deterministic["time"])

    def test_explain_endpoint_valid_request(self):
        payload = {
            "code": "public class Main { public static void main(String[] args) {} }",
            "language": "java",
            "metrics": {
                "time_complexity": "O(1)",
                "space_complexity": "O(1)",
                "optimization_score": 100,
                "dead_code_count": 0,
            },
        }
        response = self.client.post(
            "/explain",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()

        self.assertTrue(data.get("success"))
        self.assertFalse(data.get("provider_configured"))
        self.assertIn("Java", data["explanation"]["summary"])

    def test_explain_endpoint_missing_code_validation(self):
        payload = {
            "code": "   ",
            "language": "python",
        }
        response = self.client.post(
            "/explain",
            data=json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        data = response.get_json()

        self.assertFalse(data.get("success"))
        self.assertEqual(data.get("error"), "EmptyCode")

    def test_pluggable_llm_provider_registry(self):
        register_ai_provider("dummy_llm", DummyLLMProvider)
        service = AIExplanationService(provider_name="dummy_llm")

        self.assertTrue(service.is_provider_configured())

        ctx = AIExplanationContext(
            source_code="fn main() {}",
            language="rust",
            time_complexity="O(1)",
            space_complexity="O(1)",
            optimization_score=100,
        )
        res = service.explain(ctx)

        self.assertTrue(res.get("success"))
        self.assertTrue(res.get("provider_configured"))
        self.assertEqual(res.get("provider"), "dummy_llm")
        self.assertIn("Dummy LLM analyzed rust code", res["explanation"]["summary"])
        self.assertFalse(res["metadata"]["fallback_used"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
