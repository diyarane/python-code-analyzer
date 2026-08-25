"""
Automated test suite for Shared Dead Code Analysis Framework.
"""

import unittest
from analyzer.ast_parser import analyze_code
from analyzer.dead_code import (
    DeadCodeCapability,
    DeadCodeCategory,
    DeadCodeFinding,
    DeadCodeResult,
    UnsupportedDeadCodeAnalyzer,
)


class TestDeadCodeFramework(unittest.TestCase):
    def test_finding_and_result_serialization(self):
        finding = DeadCodeFinding(
            category=DeadCodeCategory.UNREACHABLE_STATEMENT.value,
            message="Unreachable statement after return",
            line=10,
            column=4,
            end_line=12,
            symbol=None,
            reason="Statement will never execute.",
        )

        res = DeadCodeResult(
            supported=True,
            count=1,
            findings=[finding],
            capability=DeadCodeCapability(
                supported=True,
                categories=[DeadCodeCategory.UNREACHABLE_STATEMENT.value],
                reason="Python analyzer dead-code detection.",
            ),
            reason="Analysis complete",
        )

        d = res.to_dict()
        self.assertTrue(d["supported"])
        self.assertEqual(d["count"], 1)
        self.assertEqual(len(d["findings"]), 1)
        self.assertEqual(d["findings"][0]["category"], "unreachable-statement")
        self.assertEqual(d["findings"][0]["line"], 10)

    def test_unsupported_analyzer_fallback(self):
        fallback = UnsupportedDeadCodeAnalyzer("C++")
        res = fallback.analyze(None, "")

        self.assertFalse(res.supported)
        self.assertEqual(res.count, 0)
        self.assertEqual(res.findings, [])
        self.assertIn("Dead-code detection is not currently implemented for C++ in this analyzer.", res.reason)

    def test_python_analyzer_produces_dead_code_result(self):
        code = "def fn():\n    return 42\n    print('dead')\n"
        res = analyze_code(code, language="python")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        dead_res = metrics.get("dead_code_result")

        self.assertIsNotNone(dead_res)
        supported = dead_res.get("supported") if isinstance(dead_res, dict) else dead_res.supported
        count = dead_res.get("count") if isinstance(dead_res, dict) else dead_res.count
        findings = dead_res.get("findings") if isinstance(dead_res, dict) else dead_res.findings

        self.assertTrue(supported)
        self.assertGreaterEqual(count, 1)
        self.assertGreaterEqual(len(findings), 1)

    def test_python_supported_with_zero_findings(self):
        code = "def fn():\n    return 42\nfn()\n"
        res = analyze_code(code, language="python")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        dead_res = metrics.get("dead_code_result")

        self.assertIsNotNone(dead_res)
        supported = dead_res.get("supported") if isinstance(dead_res, dict) else dead_res.supported
        count = dead_res.get("count") if isinstance(dead_res, dict) else dead_res.count
        findings = dead_res.get("findings") if isinstance(dead_res, dict) else dead_res.findings

        self.assertTrue(supported)
        self.assertEqual(count, 0)
        self.assertEqual(len(findings), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
