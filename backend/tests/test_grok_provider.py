"""
Automated Test Suite for xAI Grok AI Provider Integration.
Tests configuration state, mocked API calls, API/network failure fallbacks, malformed JSON recovery,
Bubble Sort inefficiency analysis, and deterministic engine preservation.
"""

import json
import os
import unittest
from unittest.mock import MagicMock, patch

from analyzer.ai.context import AIExplanationContext
from analyzer.ai.grok_provider import GrokAIProvider
from analyzer.ai.service import AIExplanationService, get_ai_explanation_service
from analyzer.ast_parser import analyze_code


class TestGrokAIProvider(unittest.TestCase):
    def setUp(self):
        self.original_env = dict(os.environ)

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self.original_env)

    def test_grok_provider_configuration_state(self):
        # Without key
        os.environ.pop("XAI_API_KEY", None)
        provider = GrokAIProvider()
        self.assertFalse(provider.is_configured())

        # With key
        os.environ["XAI_API_KEY"] = "xai-test-dummy-api-key-12345"
        provider_configured = GrokAIProvider()
        self.assertTrue(provider_configured.is_configured())

    @patch("openai.OpenAI")
    def test_grok_provider_successful_mocked_response(self, mock_openai_cls):
        os.environ["XAI_API_KEY"] = "xai-mock-key"

        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client

        mock_completion = MagicMock()
        mock_completion.choices = [
            MagicMock(
                message=MagicMock(
                    content=json.dumps({
                        "summary": "Mocked Grok analysis of Python function.",
                        "time": "Time complexity is O(N) linear time.",
                        "space": "Space complexity is O(1) constant auxiliary space.",
                        "optimization": "Algorithm is optimal.",
                        "recommendations": ["Keep existing implementation."],
                    })
                )
            )
        ]
        mock_client.chat.completions.create.return_value = mock_completion

        provider = GrokAIProvider()
        ctx = AIExplanationContext(
            source_code="def add(a, b): return a + b",
            language="python",
            time_complexity="O(1)",
            space_complexity="O(1)",
            optimization_score=100,
        )

        res = provider.generate_explanation(ctx)

        self.assertTrue(res["success"])
        self.assertTrue(res["provider_configured"])
        self.assertEqual(res["provider"], "grok")
        self.assertFalse(res["metadata"]["fallback_used"])
        self.assertEqual(res["explanation"]["summary"], "Mocked Grok analysis of Python function.")
        self.assertIn("Keep existing implementation.", res["recommendations"])

    @patch("openai.OpenAI")
    def test_grok_provider_api_error_fallback(self, mock_openai_cls):
        os.environ["XAI_API_KEY"] = "xai-mock-key"

        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        mock_client.chat.completions.create.side_effect = Exception("API Connection Timeout")

        provider = GrokAIProvider()
        ctx = AIExplanationContext(
            source_code="def loop(): pass",
            language="python",
            time_complexity="O(1)",
            space_complexity="O(1)",
            optimization_score=100,
        )

        res = provider.generate_explanation(ctx)

        self.assertTrue(res["success"])
        self.assertTrue(res["provider_configured"])
        self.assertEqual(res["provider"], "grok")
        self.assertTrue(res["metadata"]["fallback_used"])
        self.assertIn("Grok API error", res["metadata"]["reason"])

    @patch("openai.OpenAI")
    def test_grok_provider_malformed_json_recovery(self, mock_openai_cls):
        os.environ["XAI_API_KEY"] = "xai-mock-key"

        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client

        mock_completion = MagicMock()
        mock_completion.choices = [
            MagicMock(message=MagicMock(content="Invalid non-json response text from model"))
        ]
        mock_client.chat.completions.create.return_value = mock_completion

        provider = GrokAIProvider()
        ctx = AIExplanationContext(
            source_code="def foo(): pass",
            language="python",
        )

        res = provider.generate_explanation(ctx)

        self.assertTrue(res["success"])
        self.assertTrue(res["metadata"]["fallback_used"])
        self.assertIn("malformed JSON", res["metadata"]["reason"])

    @patch("openai.OpenAI")
    def test_bubble_sort_algorithmic_inefficiency_analysis(self, mock_openai_cls):
        os.environ["XAI_API_KEY"] = "xai-mock-key"

        bubble_sort_code = """def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr
"""

        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client

        mock_completion = MagicMock()
        mock_completion.choices = [
            MagicMock(
                message=MagicMock(
                    content=json.dumps({
                        "summary": "Functionally correct Bubble Sort implementation.",
                        "time": "Time complexity is O(N^2) quadratic due to nested comparison loops.",
                        "space": "Space complexity is O(1) in-place sorting.",
                        "optimization": "Bubble Sort is inefficient for large datasets.",
                        "recommendations": [
                            "Replace Bubble Sort with Python's native sorted() or list.sort() (Timsort, O(N log N))."
                        ],
                    })
                )
            )
        ]
        mock_client.chat.completions.create.return_value = mock_completion

        ctx = AIExplanationContext(
            source_code=bubble_sort_code,
            language="python",
            time_complexity="O(N^2)",
            space_complexity="O(1)",
            optimization_score=60,
            dead_code_count=0,
        )

        service = AIExplanationService(provider_name="grok", api_key="xai-mock-key")
        res = service.explain(ctx)

        self.assertTrue(res["success"])
        self.assertEqual(res["provider"], "grok")
        self.assertFalse(res["metadata"]["fallback_used"])
        self.assertIn("O(N^2)", res["explanation"]["time"])
        self.assertIn("sorted()", res["recommendations"][0])

    def test_preservation_of_deterministic_static_analysis(self):
        # Direct call to analyze_code must NEVER make external network calls
        code = "def sample():\n    return 42"
        res = analyze_code(code, language="python")
        self.assertTrue(res["success"])
        self.assertIn("ast", res)
        self.assertIn("metrics", res)
        self.assertIn("explanations", res)


if __name__ == "__main__":
    unittest.main(verbosity=2)
