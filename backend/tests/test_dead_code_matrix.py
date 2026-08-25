"""
Comprehensive 10-Language Dead Code Analysis Test Matrix.
Tests Python, JS, JSX, TS, TSX, C, C++, Java, Go, and Rust.
"""

import unittest
from analyzer.ast_parser import analyze_code


class TestDeadCodeMatrix(unittest.TestCase):
    def setUp(self):
        self.matrix = [
            {
                "language": "python",
                "clean": "def add(a, b):\n    return a + b\nadd(1, 2)\n",
                "dead": "def add(a, b):\n    return a + b\n    print('unreachable')\nadd(1, 2)\n",
                "construct": "if False:\n    pass\n",
            },
            {
                "language": "javascript",
                "clean": "export function add(a, b) { return a + b; }",
                "dead": "function add(a, b) { return a + b; console.log('unreachable'); }",
                "construct": "function check() { if (false) { return 0; } return 1; }",
            },
            {
                "language": "javascript_jsx",
                "clean": "export const Btn = () => <button>Click</button>;",
                "dead": "export const Btn = () => { return <button>Click</button>; const dead = 1; };",
                "construct": "export const Card = () => { if (false) return null; return <div>Card</div>; };",
            },
            {
                "language": "typescript",
                "clean": "interface User { id: number; }\nexport function getId(u: User): number { return u.id; }",
                "dead": "function getId(u: any): number { return u.id; const dead = 1; }",
                "construct": "type Point = { x: number }; function fn() { if (false) return; }",
            },
            {
                "language": "typescript_tsx",
                "clean": "export const Item: React.FC<{ label: string }> = ({ label }) => <span>{label}</span>;",
                "dead": "export const Item: React.FC = () => { return <span>Item</span>; const dead = 1; };",
                "construct": "export const App: React.FC = () => { if (false) return null; return <div>App</div>; };",
            },
            {
                "language": "c",
                "clean": "int add(int a, int b) { return a + b; }",
                "dead": "int add(int a, int b) { return a + b; int dead = 0; }",
                "construct": "int fn() { if (0) { return 0; } return 1; }",
            },
            {
                "language": "cpp",
                "clean": "class Calc { public: int add(int a, int b) { return a + b; } };",
                "dead": "int add(int a, int b) { return a + b; int dead = 0; }",
                "construct": "int fn() { try { throw 1; int dead = 2; } catch(...) {} return 0; }",
            },
            {
                "language": "java",
                "clean": "public class Main { public int add(int a, int b) { return a + b; } }",
                "dead": "public class Main { public int add(int a, int b) { return a + b; int dead = 0; } }",
                "construct": "public class Main { public int fn() { if (false) { return 0; } return 1; } }",
            },
            {
                "language": "go",
                "clean": "package main\nfunc Add(a, b int) int { return a + b }",
                "dead": "package main\nfunc add(a, b int) int {\n    return a + b\n    dead := 0\n    return dead\n}",
                "construct": "package main\nfunc check() {\n    panic(\"error\")\n    dead := 1\n}",
            },
            {
                "language": "rust",
                "clean": "pub fn add(a: i32, b: i32) -> i32 { a + b }",
                "dead": "fn add(a: i32, b: i32) -> i32 {\n    return a + b;\n    let dead = 0;\n    return dead;\n}",
                "construct": "fn check() {\n    panic!(\"error\");\n    let dead = 1;\n}",
            },
        ]

    def test_clean_code_zero_findings_all_languages(self):
        for case in self.matrix:
            lang = case["language"]
            res = analyze_code(case["clean"], language=lang)
            self.assertTrue(res.get("success"), f"Clean code analysis failed for {lang}")
            metrics = res.get("metrics", {})
            dead_res = metrics.get("dead_code_result")
            self.assertIsNotNone(dead_res, f"Missing dead_code_result for {lang}")

            supported = dead_res.get("supported") if isinstance(dead_res, dict) else dead_res.supported
            count = dead_res.get("count") if isinstance(dead_res, dict) else dead_res.count

            self.assertTrue(supported, f"Dead code should be supported for {lang}")
            self.assertEqual(count, 0, f"Expected 0 findings for clean {lang} code")
            self.assertEqual(metrics["metric_status"]["dead_code_count"]["status"], "available")

    def test_unreachable_statement_detected_all_languages(self):
        for case in self.matrix:
            lang = case["language"]
            res = analyze_code(case["dead"], language=lang)
            self.assertTrue(res.get("success"), f"Dead code analysis failed for {lang}")
            metrics = res.get("metrics", {})
            dead_res = metrics.get("dead_code_result")
            self.assertIsNotNone(dead_res, f"Missing dead_code_result for {lang}")

            count = dead_res.get("count") if isinstance(dead_res, dict) else dead_res.count
            findings = dead_res.get("findings") if isinstance(dead_res, dict) else dead_res.findings

            self.assertGreaterEqual(len(findings), 1, f"No dead code findings returned for {lang}")
            line = findings[0].get("line") if isinstance(findings[0], dict) else findings[0].line
            self.assertIsNotNone(line, f"Missing line number for {lang}")

    def test_language_specific_constructs_detected(self):
        for case in self.matrix:
            lang = case["language"]
            res = analyze_code(case["construct"], language=lang)
            self.assertTrue(res.get("success"), f"Construct analysis failed for {lang}")
            metrics = res.get("metrics", {})
            dead_res = metrics.get("dead_code_result")
            self.assertIsNotNone(dead_res, f"Missing dead_code_result for {lang}")

            count = dead_res.get("count") if isinstance(dead_res, dict) else dead_res.count
            self.assertGreaterEqual(count, 1, f"Expected finding for construct in {lang}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
