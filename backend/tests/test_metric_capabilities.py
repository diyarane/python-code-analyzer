"""
Automated test suite for Metric Capabilities & Language Adapter Status Maps.
"""

import unittest
from analyzer.ast_parser import analyze_code


class TestMetricCapabilities(unittest.TestCase):
    def test_python_dead_code_status_is_available(self):
        code = "def foo(): pass"
        res = analyze_code(code, language="python")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        status_map = metrics.get("metric_status", {})
        self.assertIn("dead_code_count", status_map)
        self.assertEqual(status_map["dead_code_count"]["status"], "available")
        self.assertIsNotNone(metrics.get("dead_code_count"))

    def test_supported_dead_code_languages_status(self):
        supported_cases = [
            ("python", "def foo(): pass\nfoo()"),
            ("javascript", "export function foo() {}"),
            ("typescript", "export function foo(x: number) {}"),
            ("javascript_jsx", "export const App = () => <div>Hello</div>;"),
            ("typescript_tsx", "export const App: React.FC = () => <div>Hello</div>;"),
            ("c", "int add(int a, int b) { return a + b; }"),
            ("cpp", "int add(int a, int b) { return a + b; }"),
            ("java", "public class Main { public static void main(String[] a) {} }"),
            ("go", "package main\nfunc main() {}"),
            ("rust", "fn main() {}"),
        ]
        for lang, code in supported_cases:
            res = analyze_code(code, language=lang)
            self.assertTrue(res.get("success"), f"Analysis failed for {lang}")
            metrics = res.get("metrics", {})
            status_map = metrics.get("metric_status", {})
            self.assertIn("dead_code_count", status_map, f"Missing dead_code_count status for {lang}")
            self.assertEqual(status_map["dead_code_count"]["status"], "available", f"Expected available status for {lang}")
            self.assertIsNotNone(metrics.get("dead_code_count"), f"Expected non-None dead_code_count for {lang}")

    def test_unsupported_languages_dead_code_status_and_reason(self):
        unsupported_cases = []

        for lang, code in unsupported_cases:
            res = analyze_code(code, language=lang)
            self.assertTrue(res.get("success"), f"Analysis failed for {lang}")
            metrics = res.get("metrics", {})
            status_map = metrics.get("metric_status", {})
            self.assertIn("dead_code_count", status_map, f"Missing dead_code_count status for {lang}")
            self.assertEqual(status_map["dead_code_count"]["status"], "unsupported", f"Expected unsupported status for {lang}")
            self.assertIsNone(metrics.get("dead_code_count"), f"Expected None dead_code_count for {lang}")
            self.assertIn("reason", status_map["dead_code_count"])

    def test_estimated_metrics_on_all_languages(self):
        samples = {
            "python": "def fn(): pass",
            "javascript": "function fn() {}",
            "typescript": "function fn(x: number) {}",
            "java": "public class Main { public static void fn() {} }",
            "c": "void fn() {}",
            "cpp": "void fn() {}",
            "go": "package main\nfunc fn() {}",
            "rust": "fn fn_test() {}",
        }
        for lang, code in samples.items():
            res = analyze_code(code, language=lang)
            self.assertTrue(res.get("success"), f"Failed for {lang}")
            metrics = res.get("metrics", {})
            self.assertIn("time_complexity", metrics)
            self.assertIn("space_complexity", metrics)
            self.assertIn("optimization_score", metrics)


if __name__ == "__main__":
    unittest.main(verbosity=2)
