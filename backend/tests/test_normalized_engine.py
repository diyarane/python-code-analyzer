"""
Automated test suite for Normalized Analysis Engine and Metric Status Contracts.
Ensures no language receives fabricated metric values and all statuses are explicitly reported.
"""

import unittest
from analyzer.ast_parser import analyze_code


class TestNormalizedEngine(unittest.TestCase):
    def test_python_retains_available_dead_code(self):
        py_code = """
def active_func():
    return 42

def unused_func():
    return "dead"
"""
        res = analyze_code(py_code, language="python")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        self.assertIsNotNone(metrics.get("dead_code_count"))
        
        status_map = metrics.get("metric_status", {})
        self.assertEqual(status_map.get("dead_code_count", {}).get("status"), "available")
        self.assertEqual(status_map.get("time_complexity", {}).get("status"), "estimated")
        self.assertEqual(status_map.get("space_complexity", {}).get("status"), "estimated")

    def test_javascript_measured_dead_code(self):
        js_code = """
function activeFunc() {
    return 42;
    console.log("dead");
}
"""
        res = analyze_code(js_code, language="javascript")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})
        
        self.assertIsNotNone(metrics.get("dead_code_count"))
        self.assertGreaterEqual(metrics.get("dead_code_count"), 1)

        status_map = metrics.get("metric_status", {})
        self.assertEqual(status_map.get("dead_code_count", {}).get("status"), "available")
        self.assertEqual(status_map.get("time_complexity", {}).get("status"), "estimated")

    def test_typescript_measured_dead_code(self):
        ts_code = """
interface User { id: number; }
function active(u: User): number {
    return u.id;
    const dead = true;
}
"""
        res = analyze_code(ts_code, language="typescript")
        self.assertTrue(res.get("success"))
        metrics = res.get("metrics", {})

        self.assertIsNotNone(metrics.get("dead_code_count"))
        self.assertGreaterEqual(metrics.get("dead_code_count"), 1)

        status_map = metrics.get("metric_status", {})
        self.assertEqual(status_map.get("dead_code_count", {}).get("status"), "available")
        self.assertEqual(status_map.get("time_complexity", {}).get("status"), "estimated")

    def test_no_fabricated_metrics_on_unsupported_languages(self):
        codes = [
            ("java", "public class Main { public static void main(String[] a) {} }"),
            ("go", "package main\nfunc main() {}"),
            ("rust", "fn main() {}"),
        ]

        for lang, src in codes:
            res = analyze_code(src, language=lang)
            self.assertTrue(res.get("success"), f"Analysis failed for {lang}")
            metrics = res.get("metrics", {})
            self.assertIn("metric_status", metrics, f"Missing metric_status for {lang}")
            
            self.assertIsNone(
                metrics.get("dead_code_count"),
                f"Fabricated dead_code_count for {lang}: {metrics.get('dead_code_count')}"
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
