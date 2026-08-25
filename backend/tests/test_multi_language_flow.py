"""
Automated test suite simulating rapid sequential multi-language analysis requests.
"""

import unittest
from analyzer.ast_parser import analyze_code


class TestMultiLanguageFlow(unittest.TestCase):
    def test_rapid_sequential_multi_language_analysis(self):
        snippets = [
            ("python", "def py_fn(): return 42", "main.py"),
            ("javascript", "const jsFn = () => 42;", "main.js"),
            ("typescript", "const tsFn = (x: number): number => x;", "main.ts"),
            ("java", "public class Main { public static void main(String[] args) {} }", "Main.java"),
            ("c", "#include <stdio.h>\nint main() { return 0; }", "main.c"),
            ("cpp", "#include <iostream>\nint main() { return 0; }", "main.cpp"),
            ("go", "package main\nfunc main() {}", "main.go"),
            ("rust", "fn main() { println!(\"hi\"); }", "main.rs"),
        ]

        for expected_lang, code, filename in snippets:
            res = analyze_code(code, language=expected_lang, filename=filename)
            self.assertTrue(res.get("success"), f"Analysis failed for {expected_lang}")
            self.assertEqual(res.get("language"), expected_lang)
            self.assertIsNotNone(res.get("ast"))
            self.assertIn("time_complexity", res.get("metrics", {}))
            self.assertIn("summary", res.get("explanations", {}))

            # Verify dead_code metric contract
            if expected_lang in ("python", "javascript", "typescript", "javascript_jsx", "typescript_tsx"):
                self.assertIsNotNone(res["metrics"].get("dead_code_count"))
            else:
                self.assertIsNone(res["metrics"].get("dead_code_count"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
